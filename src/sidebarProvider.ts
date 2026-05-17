import * as path from "node:path";
import * as vscode from "vscode";
import { getWebviewHtml } from "./webviewHtml";
import { OpenCodeService } from "./opencodeService";
import { storageBridge } from "./storageBridge";
import type {
  ExtensionSettingKey,
  ExtensionSettings,
  HostAction,
  HostToWebviewMessage,
  WebviewToHostMessage,
} from "./webviewProtocol";

type NativeSettings = {
  language: string;
  uiColorScheme: "system" | "light" | "dark";
  themeId: string;
  uiFont: string;
  codeFont: string;
  autoSave: boolean;
  fontSize: number;
  showReasoningSummaries: boolean;
  shellToolPartsExpanded: boolean;
  editToolPartsExpanded: boolean;
  releaseNotes: boolean;
  checkUpdatesOnStartup: boolean;
  notifyAgent: boolean;
  notifyPermissions: boolean;
  notifyErrors: boolean;
  soundAgentEnabled: boolean;
  soundAgent: string;
  soundPermissionsEnabled: boolean;
  soundPermissions: string;
  soundErrorsEnabled: boolean;
  soundErrors: string;
  autoAcceptWorkspacePermissions: boolean;
  customKeybinds: Record<string, string> | null;
  modelVisibility: Record<string, "show" | "hide"> | null;
};

export class OpenCodeSidebarProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  static readonly viewId = "opencodeVisual.sidebar";
  private static readonly diffScheme = "opencode-diff";
  private static readonly maxDiffEntries = 200;

  private readonly disposables: vscode.Disposable[] = [];
  private readonly fetches = new Map<string, AbortController>();
  private readonly diffContent = new Map<string, string>();
  private view?: vscode.WebviewView;
  private ready = false;
  private readonly pendingMessages: HostToWebviewMessage[] = [];
  private readonly stop = storageBridge.register("sidebar", (message) => this.postMessage(message));

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly service: OpenCodeService,
  ) {
    this.disposables.push(
      vscode.workspace.registerTextDocumentContentProvider(OpenCodeSidebarProvider.diffScheme, {
        provideTextDocumentContent: (uri) => this.diffContent.get(uri.toString()) ?? "",
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        if (document.uri.scheme !== OpenCodeSidebarProvider.diffScheme) {
          return;
        }
        this.diffContent.delete(document.uri.toString());
      }),
    );
  }

  dispose() {
    this.stop();
    vscode.Disposable.from(...this.disposables).dispose();
  }

  async reveal() {
    await vscode.commands.executeCommand("workbench.view.extension.opencodeVisual");
    this.view?.show?.(true);
  }

  async reload() {
    await this.render();
  }

  async openSettings() {
    await vscode.commands.executeCommand("opencodeVisual.openSettings");
  }

  private getExtensionSettings(): ExtensionSettings {
    const config = vscode.workspace.getConfiguration("opencodeVisual");
    return {
      opencodePath: config.get<string>("opencodePath", "opencode"),
      serverBaseUrl: config.get<string>("serverBaseUrl", "http://127.0.0.1:4096"),
      autoStartServer: config.get<boolean>("autoStartServer", true),
      debugServerLogs: config.get<boolean>("debugServerLogs", false),
    };
  }

  private async setExtensionSetting(key: ExtensionSettingKey, value: string | boolean) {
    const config = vscode.workspace.getConfiguration("opencodeVisual");

    if ((key === "opencodePath" || key === "serverBaseUrl") && typeof value !== "string") {
      throw new Error(`Invalid value for ${key}`);
    }

    if ((key === "autoStartServer" || key === "debugServerLogs") && typeof value !== "boolean") {
      throw new Error(`Invalid value for ${key}`);
    }

    await config.update(key, value, vscode.ConfigurationTarget.Global);
    return this.getExtensionSettings();
  }

  dispatchAction(action: HostAction) {
    this.postMessage({ type: "hostAction", action });
  }

  notifyTheme() {
    this.postMessage({
      type: "hostTheme",
      colorScheme: this.getColorScheme(),
    });
  }

  async resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    this.ready = false;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
    };
    const receiveDisposable = webviewView.webview.onDidReceiveMessage(async (message: WebviewToHostMessage) => {
      await this.handleMessage(message);
    });

    const disposeDisposable = webviewView.onDidDispose(() => {
      this.view = undefined;
      receiveDisposable.dispose();
    });

    this.disposables.push(receiveDisposable, disposeDisposable);
    await this.render();
  }

  private async handleMessage(message: WebviewToHostMessage) {
    try {
      if (message.type === "webviewReady") {
        this.ready = true;
        this.flushMessages();
        this.notifyTheme();
        storageBridge.ready("sidebar");
        return;
      }

      if (message.type === "openLink") {
        await vscode.env.openExternal(vscode.Uri.parse(message.url));
        return;
      }

      if (message.type === "openDiff") {
        await this.openDiff(message.filePath, message.before, message.after);
        return;
      }

      if (message.type === "openSettings") {
        await this.openSettings();
        return;
      }

      if (message.type === "pickDirectory") {
        this.postMessage({
          type: "pickDirectoryResult",
          requestId: message.requestId,
          value: null,
        });
        return;
      }

      if (message.type === "fetchAbort") {
        this.fetches.get(message.requestId)?.abort();
        this.fetches.delete(message.requestId);
        return;
      }

      if (message.type === "fetchRequest") {
        await this.handleFetch(message);
        return;
      }

      if (message.type === "getExtensionSettings") {
        this.postMessage({
          type: "extensionSettingsResult",
          requestId: message.requestId,
          value: this.getExtensionSettings(),
        });
        return;
      }

      if (message.type === "setExtensionSetting") {
        try {
          const value = await this.setExtensionSetting(message.key, message.value);
          this.postMessage({
            type: "extensionSettingResult",
            requestId: message.requestId,
            value,
          });
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          this.postMessage({
            type: "extensionSettingResult",
            requestId: message.requestId,
            value: null,
            error: text,
          });
        }
        return;
      }

      if (message.type === "storageSet" || message.type === "storageRemove") {
        storageBridge.apply("sidebar", message);
        return;
      }

      if (message.type === "restartServer") {
        try {
          await vscode.commands.executeCommand("opencodeVisual.restartServer");
          this.postMessage({
            type: "restartServerResult",
            requestId: message.requestId,
          });
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          this.postMessage({
            type: "restartServerResult",
            requestId: message.requestId,
            error: text,
          });
        }
        return;
      }

      return;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(messageText);
    }
  }

  private async render() {
    if (!this.view) {
      return;
    }

    this.ready = false;
    let disableHealthCheck = false;
    let serverUrl = this.service.getResolvedServerBaseUrl();
    try {
      serverUrl = await this.service.ensureServerReady();
      disableHealthCheck = await this.shouldDisableHealthCheck(serverUrl);
    } catch {
      disableHealthCheck = true;
      serverUrl = this.service.getResolvedServerBaseUrl();
    }
    const workspaceDirectory = this.service.getWorkspaceContext().directory ?? null;
    this.view.webview.html = getWebviewHtml(this.view.webview, this.context.extensionUri, {
      serverUrl,
      version: String(this.context.extension.packageJSON.version ?? "0.0.0"),
      workspaceDirectory,
      colorScheme: this.getColorScheme(),
      disableHealthCheck,
      sharedStorage: storageBridge.snapshot(),
      nativeSettings: this.getNativeSettings(),
    });
  }

  private getNativeSettings(): NativeSettings {
    const config = vscode.workspace.getConfiguration("opencodeVisual");
    return {
      language: config.get<string>("language", "auto"),
      uiColorScheme: config.get<"system" | "light" | "dark">("uiColorScheme", "system"),
      themeId: config.get<string>("themeId", "oc-2"),
      uiFont: config.get<string>("uiFont", ""),
      codeFont: config.get<string>("codeFont", ""),
      autoSave: config.get<boolean>("autoSave", true),
      fontSize: config.get<number>("fontSize", 14),
      showReasoningSummaries: config.get<boolean>("showReasoningSummaries", false),
      shellToolPartsExpanded: config.get<boolean>("shellToolPartsExpanded", false),
      editToolPartsExpanded: config.get<boolean>("editToolPartsExpanded", false),
      releaseNotes: config.get<boolean>("releaseNotes", true),
      checkUpdatesOnStartup: config.get<boolean>("checkUpdatesOnStartup", true),
      notifyAgent: config.get<boolean>("notifyAgent", true),
      notifyPermissions: config.get<boolean>("notifyPermissions", true),
      notifyErrors: config.get<boolean>("notifyErrors", false),
      soundAgentEnabled: config.get<boolean>("soundAgentEnabled", true),
      soundAgent: config.get<string>("soundAgent", "staplebops-01"),
      soundPermissionsEnabled: config.get<boolean>("soundPermissionsEnabled", true),
      soundPermissions: config.get<string>("soundPermissions", "staplebops-02"),
      soundErrorsEnabled: config.get<boolean>("soundErrorsEnabled", true),
      soundErrors: config.get<string>("soundErrors", "nope-03"),
      autoAcceptWorkspacePermissions: config.get<boolean>("autoAcceptWorkspacePermissions", false),
      customKeybinds: config.get<Record<string, string> | null>("customKeybinds", null),
      modelVisibility: config.get<Record<string, "show" | "hide"> | null>("modelVisibility", null),
    };
  }

  private async shouldDisableHealthCheck(serverUrl: string) {
    let target: string;
    try {
      target = new URL("/global/health", serverUrl).toString();
    } catch {
      return true;
    }

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 2500);

    try {
      const response = await fetch(target, {
        method: "GET",
        signal: abort.signal,
      });

      if (response.status === 404 || response.status === 405 || response.status === 501) {
        return true;
      }

      if (response.ok) {
        return false;
      }

      const text = await response.text().catch(() => "");
      if (/not found|unknown route|cannot\s+\w+\s+\/global\/health/i.test(text)) {
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private getColorScheme(): "light" | "dark" {
    const kind = vscode.window.activeColorTheme.kind;
    if (kind === vscode.ColorThemeKind.Light || kind === vscode.ColorThemeKind.HighContrastLight) {
      return "light";
    }
    return "dark";
  }

  private async openFile(
    filePath: string,
    range?: {
      startLine: number;
      startCharacter: number;
      endLine: number;
      endCharacter: number;
    },
  ) {
    const baseDirectory = this.service.getActiveSessionDirectory();
    const targetPath = path.isAbsolute(filePath) ? filePath : path.join(baseDirectory ?? "", filePath);
    const uri = vscode.Uri.file(targetPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document, { preview: false });

    if (range) {
      const selection = new vscode.Selection(
        new vscode.Position(range.startLine, range.startCharacter),
        new vscode.Position(range.endLine, range.endCharacter),
      );
      editor.selection = selection;
      editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
    }
  }

  private async openDiff(filePath: string, before: string, after: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const left = this.createDiffUri(filePath, "before", before, id);
    const right = this.createDiffUri(filePath, "after", after, id);
    const title = `OpenCode Diff: ${filePath}`;
    await vscode.commands.executeCommand("vscode.diff", left, right, title, { preview: false });
  }

  private createDiffUri(filePath: string, side: "before" | "after", content: string, id: string) {
    const normalized = filePath.replaceAll("\\", "/").replace(/^\/+/, "") || "untitled";
    const uri = vscode.Uri.from({
      scheme: OpenCodeSidebarProvider.diffScheme,
      path: `/${side}/${id}/${normalized}`,
    });
    this.diffContent.set(uri.toString(), content);
    this.trimDiffContent();
    return uri;
  }

  private trimDiffContent() {
    while (this.diffContent.size > OpenCodeSidebarProvider.maxDiffEntries) {
      const key = this.diffContent.keys().next().value;
      if (!key) {
        return;
      }
      this.diffContent.delete(key);
    }
  }

  private flushMessages() {
    while (this.ready && this.view && this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (!message) {
        return;
      }
      void this.view.webview.postMessage(message);
    }
  }

  private postMessage(message: HostToWebviewMessage) {
    if (!this.ready || !this.view) {
      this.pendingMessages.push(message);
      return;
    }
    void this.view.webview.postMessage(message);
  }

  private resolveFetchUrl(input: string) {
    try {
      const url = new URL(input);
      if (url.hostname === "opencode.localhost") {
        const base = this.service.getResolvedServerBaseUrl();
        try {
          const target = new URL(base);
          url.protocol = target.protocol;
          url.hostname = target.hostname;
          url.port = target.port;
        } catch {
          url.hostname = "127.0.0.1";
        }
      }
      return url.toString();
    } catch {
      return input;
    }
  }

  private isLocalHostname(hostname: string) {
    const normalized = hostname.toLowerCase();
    return normalized === "opencode.localhost"
      || normalized === "localhost"
      || normalized === "127.0.0.1"
      || normalized === "::1"
      || normalized === "[::1]";
  }

  private buildFetchCandidates(input: string) {
    const primary = this.resolveFetchUrl(input);
    try {
      const url = new URL(primary);
      if (!this.isLocalHostname(url.hostname)) {
        return [primary];
      }

      const candidates = [url.toString()];
      for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
        const candidate = new URL(url.toString());
        candidate.hostname = host;
        const value = candidate.toString();
        if (!candidates.includes(value)) {
          candidates.push(value);
        }
      }
      return candidates;
    } catch {
      return [primary];
    }
  }

  private isNetworkFailure(error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    return /econnrefused|econnreset|econnaborted|fetch failed|timed out|enotfound|eai_again|socket|network error/i.test(text);
  }

  private async handleFetch(message: Extract<WebviewToHostMessage, { type: "fetchRequest" }>) {
    const abort = new AbortController();
    this.fetches.set(message.requestId, abort);

    try {
      let response: Response | undefined;
      let finalUrl = this.resolveFetchUrl(message.url);
      let lastError: unknown;

      for (const candidateUrl of this.buildFetchCandidates(message.url)) {
        finalUrl = candidateUrl;
        try {
          response = await fetch(candidateUrl, {
            method: message.method,
            headers: message.headers,
            body: message.body ? Buffer.from(message.body, "base64") : undefined,
            signal: abort.signal,
          });
          break;
        } catch (error) {
          lastError = error;
          if (abort.signal.aborted || !this.isNetworkFailure(error)) {
            throw error;
          }
        }
      }

      if (!response) {
        throw lastError ?? new Error(`Failed to fetch ${finalUrl}`);
      }

      this.postMessage({
        type: "fetchResponse",
        requestId: message.requestId,
        url: response.url,
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
      });

      const reader = response.body?.getReader();
      if (!reader) {
        this.postMessage({ type: "fetchEnd", requestId: message.requestId });
        return;
      }

      while (true) {
        const result = await reader.read();
        if (result.done) {
          break;
        }

        this.postMessage({
          type: "fetchChunk",
          requestId: message.requestId,
          chunk: Buffer.from(result.value).toString("base64"),
        });
      }

      this.postMessage({ type: "fetchEnd", requestId: message.requestId });
    } catch (error) {
      if (!abort.signal.aborted) {
        const messageText = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : undefined;
        this.postMessage({
          type: "fetchError",
          requestId: message.requestId,
          message: messageText,
          name: errorName,
        });

        const urls = this.buildFetchCandidates(message.url);
        const detail = `method=${message.method} urls=${urls.join(",")} error=${errorName ?? "Error"}: ${messageText}`;
        this.service.reportNetworkIssue(detail);
      }
    } finally {
      this.fetches.delete(message.requestId);
    }
  }
}
