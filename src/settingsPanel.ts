import * as vscode from "vscode";
import { getWebviewHtml } from "./webviewHtml";
import { OpenCodeService } from "./opencodeService";
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

export class OpenCodeSettingsPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private ready = false;
  private readonly pendingMessages: HostToWebviewMessage[] = [];
  private readonly fetches = new Map<string, AbortController>();
  private panelDisposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly service: OpenCodeService,
  ) {}

  dispose() {
    for (const abort of this.fetches.values()) {
      abort.abort();
    }
    this.fetches.clear();
    this.disposePanel();
  }

  async open() {
    if (!this.panel) {
      await this.createPanel();
      this.dispatchAction("openSettings");
      return;
    }

    try {
      this.panel.reveal(vscode.ViewColumn.Active, false);
      await this.render();
    } catch {
      this.panel = undefined;
      this.clearPanelState();
      await this.createPanel();
    }

    this.dispatchAction("openSettings");
  }

  async reload() {
    if (!this.panel) {
      return;
    }

    try {
      await this.render();
    } catch (error) {
      if (this.isDisposedError(error)) {
        this.resetDisposedPanel();
        return;
      }
      throw error;
    }
  }

  notifyTheme() {
    if (!this.panel) {
      return;
    }
    this.postMessage({
      type: "hostTheme",
      colorScheme: this.getColorScheme(),
    });
  }

  private async createPanel() {
    const panel = vscode.window.createWebviewPanel(
      "opencodeVisual.settings",
      "OpenCode Settings",
      {
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: false,
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
      },
    );

    this.panel = panel;
    this.ready = false;
    const receiveDisposable = panel.webview.onDidReceiveMessage(async (message: WebviewToHostMessage) => {
      await this.handleMessage(message);
    });
    const disposeDisposable = panel.onDidDispose(() => {
      if (this.panel !== panel) {
        return;
      }
      this.panel = undefined;
      this.clearPanelState();
    });

    this.panelDisposables.push(receiveDisposable, disposeDisposable);
    await this.render();
  }

  private disposePanel() {
    const panel = this.panel;
    this.panel = undefined;
    this.clearPanelState();
    if (panel) {
      panel.dispose();
    }
  }

  private clearPanelState() {
    this.ready = false;
    this.pendingMessages.length = 0;
    for (const abort of this.fetches.values()) {
      abort.abort();
    }
    this.fetches.clear();
    vscode.Disposable.from(...this.panelDisposables).dispose();
    this.panelDisposables = [];
  }

  private isDisposedError(error: unknown) {
    const text = error instanceof Error ? error.message : String(error ?? "");
    return /webview is disposed|disposed/i.test(text);
  }

  private resetDisposedPanel() {
    this.panel = undefined;
    this.clearPanelState();
  }

  private async handleMessage(message: WebviewToHostMessage) {
    try {
      if (message.type === "webviewReady") {
        this.ready = true;
        this.flushMessages();
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
        this.dispatchAction("openSettings");
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
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(messageText);
    }
  }

  private async render() {
    const panel = this.panel;
    if (!panel) {
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
    if (this.panel !== panel) {
      return;
    }

    try {
      panel.webview.html = getWebviewHtml(panel.webview, this.context.extensionUri, {
        serverUrl,
        version: String(this.context.extension.packageJSON.version ?? "0.0.0"),
        workspaceDirectory,
        colorScheme: this.getColorScheme(),
        disableHealthCheck,
        settingsMode: true,
        nativeSettings: this.getNativeSettings(),
      });
    } catch (error) {
      if (this.isDisposedError(error)) {
        this.resetDisposedPanel();
        return;
      }
      throw error;
    }
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

  private async openDiff(filePath: string, before: string, after: string) {
    const left = await vscode.workspace.openTextDocument({ content: before });
    const right = await vscode.workspace.openTextDocument({ content: after });
    const title = `OpenCode Diff: ${filePath}`;
    await vscode.commands.executeCommand("vscode.diff", left.uri, right.uri, title, { preview: false });
  }

  private dispatchAction(action: HostAction) {
    this.postMessage({
      type: "hostAction",
      action,
    });
  }

  private postMessage(message: HostToWebviewMessage) {
    const panel = this.panel;
    if (!this.ready || !panel) {
      this.pendingMessages.push(message);
      return;
    }

    this.sendMessage(panel, message);
  }

  private flushMessages() {
    while (this.ready && this.panel && this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (!message) {
        return;
      }

      const panel = this.panel;
      if (!panel) {
        return;
      }
      this.sendMessage(panel, message);
    }
  }

  private sendMessage(panel: vscode.WebviewPanel, message: HostToWebviewMessage) {
    try {
      void panel.webview.postMessage(message).then(undefined, (error) => {
        if (this.isDisposedError(error)) {
          this.resetDisposedPanel();
          return;
        }

        const text = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(text);
      });
    } catch (error) {
      if (this.isDisposedError(error)) {
        this.resetDisposedPanel();
      }
    }
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
