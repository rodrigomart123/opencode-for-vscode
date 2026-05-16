import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  createOpencodeClient,
  type Command,
  type Config,
  type Event,
  type FileDiff,
  type FilePartInput,
  type Message,
  type OpencodeClient,
  type Part,
  type Permission,
  type Session,
  type SessionStatus,
  type TextPartInput,
  type Todo,
} from "@opencode-ai/sdk";
import type {
  Agent as V2Agent,
  Project as V2Project,
  ProviderListResponse as V2ProviderListResponse,
  VcsInfo as V2VcsInfo,
} from "@opencode-ai/sdk/v2";
import { createOpencodeClient as createOpencodeV2Client } from "@opencode-ai/sdk/v2/client";
import type {
  ComposerSelection,
  ComposerAttachmentPayload,
  ModelOption,
  ProviderOption,
  SidebarState,
  ThreadEntry,
} from "./types";

const REQUEST_OPTIONS = {
  responseStyle: "data" as const,
  throwOnError: true as const,
};

type LocalServerHandle = {
  process: ChildProcessWithoutNullStreams;
  url: string;
};

type WorkspaceContext = {
  name: string;
  directory?: string;
  hasWorkspace: boolean;
};

type DataResult<T> =
  | T
  | {
      data: T;
    };

type ProviderCatalogModel = V2ProviderListResponse["all"][number]["models"][string];
type ResolvedConfig = Pick<Config, "model" | "small_model">;
const ACTIVE_SESSION_STORAGE_PREFIX = "opencodeVisual.activeSession";
const LAST_SESSION_STORAGE_PREFIX = "opencodeVisual.lastSession";
const COMMAND_LOOKUP_TIMEOUT_MS = 2500;

const windowsPath = (input: string) => /^[A-Za-z]:/.test(input) || input.startsWith("//");

const workspaceKey = (directory: string) => {
  const value = directory.replaceAll("\\", "/");
  const drive = value.match(/^([A-Za-z]:)\/+$/);
  if (drive) return `${drive[1]}/`;
  if (/^\/+$/i.test(value)) return "/";
  return value.replace(/\/+$/, "");
};

const sameWorkspace = (left: string, right: string) => {
  const a = workspaceKey(left);
  const b = workspaceKey(right);
  if (windowsPath(a) || windowsPath(b)) return a.toLowerCase() === b.toLowerCase();
  return a === b;
};

export class OpenCodeService implements vscode.Disposable {
  private readonly stateEmitter = new vscode.EventEmitter<SidebarState>();
  private readonly output = vscode.window.createOutputChannel("OpenCode VS Code");

  private client?: OpencodeClient;
  private server?: LocalServerHandle;
  private streamAbort?: AbortController;
  private busyPollTimer?: ReturnType<typeof setInterval>;
  private busyPollSessionId?: string;
  private busyPollPending = false;
  private networkNoticeUntil = 0;
  private currentDirectory?: string;
  private bootstrapPromise?: Promise<void>;

  private sessions: Session[] = [];
  private thread: ThreadEntry[] = [];
  private permissions = new Map<string, Permission>();
  private todos: Todo[] = [];
  private diffs: FileDiff[] = [];
  private commands: Command[] = [];
  private agents: V2Agent[] = [];
  private providers: ProviderOption[] = [];
  private models: ModelOption[] = [];
  private vcs?: V2VcsInfo;
  private project: V2Project | null = null;
  private sessionStatuses = new Map<string, SessionStatus>();
  private lastError?: string;
  private resolvedConfig: ResolvedConfig = {};

  private activeSessionId?: string;
  private composer: ComposerSelection = {};
  private connectionState: SidebarState["connection"];

  readonly onDidChangeState = this.stateEmitter.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.connectionState = {
      status: "connecting",
      baseUrl: this.getSettings().serverBaseUrl,
      managed: false,
    };
  }

  dispose() {
    this.stopStream();
    this.stopBusyPolling();
    this.stopServer();
    this.stateEmitter.dispose();
    this.output.dispose();
  }

  async bootstrap() {
    if (!this.bootstrapPromise) {
      this.bootstrapPromise = this.ensureReady()
        .then(() => undefined)
        .finally(() => {
          this.bootstrapPromise = undefined;
        });
    }
    await this.bootstrapPromise;
  }

  async ensureServerReady(forceRestart = false) {
    if (forceRestart) {
      this.stopServer();
    }

    if (this.server) {
      return this.server.url;
    }

    const settings = this.getSettings();
    const baseUrl = settings.serverBaseUrl;
    this.connectionState = {
      status: "connecting",
      baseUrl,
      managed: false,
    };
    this.emitState();

    try {
      await this.pingServer(baseUrl);
      this.connectionState = {
        status: "connected",
        baseUrl,
        managed: false,
      };
      this.emitState();
      return baseUrl;
    } catch (error) {
      if (!settings.autoStartServer) {
        this.connectionState = {
          status: "error",
          baseUrl,
          managed: false,
          error: this.formatError(error),
        };
        this.emitState();
        throw error;
      }
    }

    const server = await this.startManagedServer();
    this.connectionState = {
      status: "connected",
      baseUrl: server.url,
      managed: true,
    };
    this.emitState();
    return server.url;
  }

  getResolvedServerBaseUrl() {
    return this.server?.url ?? this.getSettings().serverBaseUrl;
  }

  async refresh() {
    await this.ensureReady(true);
  }

  async restartServer() {
    this.stopServer();
    await this.ensureReady(true, true);
  }

  reportNetworkIssue(detail: string) {
    this.output.appendLine(`[network] ${detail}`);

    const now = Date.now();
    if (now < this.networkNoticeUntil) {
      return;
    }

    this.networkNoticeUntil = now + 15000;
    const hint = this.getNetworkHint(detail);
    void vscode.window
      .showWarningMessage(
        hint,
        "Open Settings",
        "Restart Local Server",
        "Show Output",
      )
      .then((action) => {
        if (action === "Open Settings") {
          void vscode.commands.executeCommand("opencodeVisual.openSettings");
          return;
        }

        if (action === "Restart Local Server") {
          void vscode.commands.executeCommand("opencodeVisual.restartServer");
          return;
        }

        if (action === "Show Output") {
          this.output.show(true);
        }
      });
  }

  async syncWorkspaceContext() {
    const nextDirectory = this.getWorkspaceContext().directory;
    if (!this.sameDirectory(nextDirectory, this.currentDirectory)) {
      await this.ensureReady(true);
      return true;
    }
    this.emitState();
    return false;
  }

  getState(): SidebarState {
    const workspace = this.getWorkspaceContext();
    return {
      connection: this.connectionState,
      lastError: this.lastError,
      workspace,
      sessions: this.sessions,
      sessionStatuses: Object.fromEntries(this.sessionStatuses.entries()),
      activeSessionId: this.activeSessionId,
      thread: this.thread,
      permissions: this.getActivePermissions(),
      todos: this.todos,
      diffs: this.diffs,
      commands: this.commands,
      agents: this.agents,
      providers: this.providers,
      models: this.models,
      composer: this.composer,
      vcs: this.vcs,
      project: this.project,
      config: {
        model: this.resolvedConfig.model,
        smallModel: this.resolvedConfig.small_model,
      },
    };
  }

  async setComposerSelection(composer: ComposerSelection) {
    const providerID = composer.providerID || undefined;
    const providerModels = providerID
      ? this.models.filter((item) => item.providerID === providerID)
      : [];
    const providerDefaultModelID = providerID
      ? this.providers.find((item) => item.id === providerID)?.defaultModelID
      : undefined;
    const fallbackModel = providerModels.find((item) => item.modelID === providerDefaultModelID) ?? providerModels[0];
    const selectedModel = composer.modelID && providerModels.some((item) => item.modelID === composer.modelID)
      ? composer.modelID
      : fallbackModel?.modelID;
    const selectedModelOption = providerModels.find((item) => item.modelID === selectedModel) ?? fallbackModel;

    this.composer = {
      providerID: providerID ?? fallbackModel?.providerID,
      modelID: selectedModel,
      agent: this.normalizeComposerAgent(composer.agent),
      variant: this.normalizeComposerVariant(selectedModelOption, composer.variant),
    };
    this.emitState();
  }

  async createSession() {
    this.lastError = undefined;
    const client = await this.ensureReady();
    const session = this.unwrap(await client.session.create(REQUEST_OPTIONS));
    this.upsertSession(session);
    this.activeSessionId = session.id;
    this.persistActiveSessionId();
    this.updateBusyPolling();
    await this.loadActiveSession(session.id);
    this.emitState();
    return session;
  }

  async selectSession(sessionId: string) {
    this.lastError = undefined;
    this.activeSessionId = sessionId;
    this.persistActiveSessionId();
    this.updateBusyPolling();
    await this.loadActiveSession(sessionId);
    this.emitState();
  }

  async deleteSession(sessionId: string) {
    this.lastError = undefined;
    const confirmed = await vscode.window.showWarningMessage(
      "Delete this OpenCode session?",
      { modal: false },
      "Delete",
    );

    if (confirmed !== "Delete") {
      return;
    }

    const client = await this.ensureReady();
    await client.session.delete({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
    });

    if (this.activeSessionId === sessionId) {
      this.activeSessionId = undefined;
      this.updateBusyPolling();
    }

    await this.refreshState();
  }

  async renameSession(sessionId: string, title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    this.lastError = undefined;
    const client = await this.ensureReady();
    await client.session.update({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: { title: trimmedTitle },
    });
    await this.refreshState();
  }

  async archiveSession(sessionId: string) {
    this.lastError = undefined;
    const directory = this.sessions.find((item) => item.id === sessionId)?.directory ?? this.currentDirectory;
    if (!directory) {
      throw new Error("Open a workspace folder before archiving a session.");
    }

    const client = this.createV2Client(this.server?.url ?? this.getSettings().serverBaseUrl, directory);
    await client.session.update({
      sessionID: sessionId,
      directory,
      time: {
        archived: Date.now(),
      },
    }, REQUEST_OPTIONS);
    await this.refreshState();
  }

  async sendPrompt(text: string, attachments: FilePartInput[]) {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) {
      return;
    }

    this.lastError = undefined;
    await this.ensureReady();
    const session = await this.ensureSessionForPrompt(trimmed || "OpenCode session");
    const sessionId = session.id;
    const directory = session.directory ?? this.currentDirectory;

    if (!directory) {
      throw new Error("Open a workspace folder before sending prompts.");
    }

    const client = this.createV2Client(this.server?.url ?? this.getSettings().serverBaseUrl, directory);
    const variant = this.composer.variant ?? undefined;

    if (trimmed.startsWith("/")) {
      const commandText = trimmed.slice(1).trim();
      const spaceIndex = commandText.indexOf(" ");
      const command = spaceIndex === -1 ? commandText : commandText.slice(0, spaceIndex);
      const args = spaceIndex === -1 ? "" : commandText.slice(spaceIndex + 1);
      if (!command) {
        return;
      }
      this.sessionStatuses.set(sessionId, { type: "busy" });
      this.updateBusyPolling();
      this.emitState();
      await client.session.command({
        sessionID: sessionId,
        directory,
        command,
        arguments: args || undefined,
        agent: this.composer.agent || "build",
        model: this.getCommandModel(),
        variant,
      }, REQUEST_OPTIONS);
      await this.loadActiveSession(sessionId);
      return;
    }

    const parts: Array<TextPartInput | FilePartInput> = [];
    if (trimmed) {
      parts.push({
        type: "text",
        text: trimmed,
      });
    }
    parts.push(...attachments);

    this.sessionStatuses.set(sessionId, { type: "busy" });
    this.updateBusyPolling();
    this.emitState();

    await client.session.promptAsync({
      sessionID: sessionId,
      directory,
      parts,
      agent: this.composer.agent || "build",
      model: this.getPromptModel(),
      variant,
    }, REQUEST_OPTIONS);

    await this.loadActiveSession(sessionId);
  }

  async replyToPermission(sessionId: string, permissionId: string, response: "once" | "always" | "reject") {
    const client = await this.ensureReady();
    await client.postSessionIdPermissionsPermissionId({
      ...REQUEST_OPTIONS,
      path: { id: sessionId, permissionID: permissionId },
      body: { response },
    });

    this.permissions.delete(permissionId);
    this.emitState();
  }

  async abortSession(sessionId: string) {
    const client = await this.ensureReady();
    await client.session.abort({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
    });
  }

  async shareSession(sessionId: string) {
    const client = await this.ensureReady();
    const session = this.unwrap(await client.session.share({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
    }));
    this.upsertSession(session);
    this.emitState();
    return session.share?.url;
  }

  async unshareSession(sessionId: string) {
    const client = await this.ensureReady();
    const session = this.unwrap(await client.session.unshare({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
    }));
    this.upsertSession(session);
    this.emitState();
  }

  async revertSession(sessionId: string) {
    this.lastError = undefined;
    const client = await this.ensureReady();
    const target = this.getLatestMessage();
    if (!target) {
      vscode.window.showInformationMessage("No message available to revert.");
      return;
    }
    const session = this.unwrap(await client.session.revert({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: {
        messageID: target.info.id,
      },
    }));
    this.upsertSession(session);
    await this.loadActiveSession(sessionId);
  }

  async unrevertSession(sessionId: string) {
    this.lastError = undefined;
    const client = await this.ensureReady();
    const session = this.unwrap(await client.session.unrevert({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
    }));
    this.upsertSession(session);
    await this.loadActiveSession(sessionId);
  }

  async runInit(sessionId: string) {
    this.lastError = undefined;
    const client = await this.ensureReady();
    const sessionMessages = this.unwrap(await client.session.messages({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
    }));
    const userMessage = [...sessionMessages].reverse().find((entry) => entry.info.role === "user");
    const model = this.getPromptModel();

    if (!userMessage || !model) {
      vscode.window.showInformationMessage("Select a model and send at least one user prompt before running init.");
      return;
    }

    await client.session.init({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: {
        messageID: userMessage.info.id,
        providerID: model.providerID,
        modelID: model.modelID,
      },
    });

    vscode.window.showInformationMessage("OpenCode init started for the active session.");
  }

  async summarizeSession(sessionId: string) {
    this.lastError = undefined;
    const client = await this.ensureReady();
    const model = this.getPromptModel();

    if (!model) {
      vscode.window.showInformationMessage("Select a model before compacting this session.");
      return;
    }

    await client.session.summarize({
      ...REQUEST_OPTIONS,
      path: { id: sessionId },
      body: model,
    });

    vscode.window.showInformationMessage("OpenCode compacted the active session.");
  }

  async captureEditorAttachment(selectionOnly: boolean): Promise<ComposerAttachmentPayload | undefined> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("Open a file in the editor first.");
      return undefined;
    }

    const document = editor.document;
    if (selectionOnly && editor.selection.isEmpty) {
      vscode.window.showInformationMessage("Select some text in the active editor first.");
      return undefined;
    }
    const range = selectionOnly && !editor.selection.isEmpty
      ? editor.selection
      : new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
    const text = document.getText(range);

    if (!text.trim()) {
      vscode.window.showInformationMessage("The current file or selection is empty.");
      return undefined;
    }

    const relativePath = vscode.workspace.asRelativePath(document.uri, false);
    const attachment: FilePartInput = {
      type: "file",
      mime: "text/plain",
      filename: path.basename(document.fileName || relativePath || "context.txt"),
      url: document.uri.toString(),
      source: {
        type: "file",
        path: relativePath,
        text: {
          value: text,
          start: document.offsetAt(range.start),
          end: document.offsetAt(range.end),
        },
      },
    };

    return {
      label: selectionOnly ? `${relativePath} (selection)` : relativePath,
      attachment,
    };
  }

  async captureImageAttachment(): Promise<ComposerAttachmentPayload | undefined> {
    const selected = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: "Insert image",
      filters: {
        Images: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"],
      },
    });

    const imageUri = selected?.[0];
    if (!imageUri) {
      return undefined;
    }

    const relativePath = vscode.workspace.asRelativePath(imageUri, false);
    return {
      label: relativePath || path.basename(imageUri.fsPath),
      attachment: {
        type: "file",
        mime: this.getImageMimeType(imageUri.fsPath),
        filename: path.basename(imageUri.fsPath),
        url: imageUri.toString(),
      },
    };
  }

  getActiveSessionDirectory() {
    const session = this.sessions.find((item) => item.id === this.activeSessionId);
    return session?.directory ?? this.currentDirectory;
  }

  private async ensureSessionForPrompt(titleSeed: string) {
    if (this.activeSessionId) {
      const existing = this.sessions.find((item) => item.id === this.activeSessionId);
      if (existing) {
        return existing;
      }
    }

    const session = await this.createSessionWithTitle(titleSeed);
    this.activeSessionId = session.id;
    this.persistActiveSessionId();
    this.updateBusyPolling();
    return session;
  }

  private async createSessionWithTitle(titleSeed: string) {
    const client = await this.ensureReady();
    const session = this.unwrap(await client.session.create({
      ...REQUEST_OPTIONS,
      body: {
        title: this.createSessionTitle(titleSeed),
      },
    }));
    this.upsertSession(session);
    return session;
  }

  private createSessionTitle(value: string) {
    return value.replace(/^\//, "").trim().slice(0, 80) || "OpenCode session";
  }

  private getImageMimeType(filePath: string) {
    switch (path.extname(filePath).toLowerCase()) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".gif":
        return "image/gif";
      case ".webp":
        return "image/webp";
      case ".bmp":
        return "image/bmp";
      case ".svg":
        return "image/svg+xml";
      case ".png":
      default:
        return "image/png";
    }
  }

  private getPromptModel() {
    if (this.composer.providerID && this.composer.modelID) {
      return {
        providerID: this.composer.providerID,
        modelID: this.composer.modelID,
      };
    }
    const fallback = this.models[0];
    if (!fallback) {
      return undefined;
    }
    return {
      providerID: fallback.providerID,
      modelID: fallback.modelID,
    };
  }

  private getCommandModel() {
    const model = this.getPromptModel();
    return model ? `${model.providerID}/${model.modelID}` : undefined;
  }

  private normalizeComposerVariant(model: ModelOption | undefined, variant: string | null | undefined) {
    if (variant === null) {
      return null;
    }

    if (!variant || !model?.variants?.includes(variant)) {
      return undefined;
    }

    return variant;
  }

  private getAgentNames() {
    return this.agents
      .filter((item) => item.mode !== "primary" && !item.hidden)
      .map((item) => item.name);
  }

  private normalizeComposerAgent(agent: string | undefined) {
    const names = this.getAgentNames();
    if (agent && names.includes(agent)) {
      return agent;
    }

    if (this.composer.agent && names.includes(this.composer.agent)) {
      return this.composer.agent;
    }

    if (names.includes("build")) {
      return "build";
    }

    return names[0] ?? "build";
  }

  private getLatestMessage() {
    return this.thread.at(-1);
  }

  private async ensureReady(forceRefresh = false, forceRestartServer = false) {
    const workspace = this.getWorkspaceContext();
    const directory = workspace.directory;
    this.connectionState = {
      ...this.connectionState,
      baseUrl: this.getSettings().serverBaseUrl,
    };

    if (!directory) {
      this.currentDirectory = undefined;
      this.client = undefined;
      this.sessions = [];
      this.thread = [];
      this.todos = [];
      this.diffs = [];
      this.commands = [];
      this.agents = [];
      this.providers = [];
      this.models = [];
      this.vcs = undefined;
      this.project = null;
      this.lastError = undefined;
      this.resolvedConfig = {};
      this.connectionState = {
        status: "error",
        baseUrl: this.getSettings().serverBaseUrl,
        managed: false,
        error: "Open a workspace folder to use OpenCode.",
      };
      this.emitState();
      throw new Error("No workspace folder is open.");
    }

    if (forceRestartServer) {
      this.stopServer();
    }

    const needsReconnect =
      !this.client ||
      !this.sameDirectory(this.currentDirectory, directory) ||
      forceRefresh;

    if (needsReconnect) {
      await this.connect(directory);
      await this.refreshState();
    }

    return this.client!;
  }

  private async connect(directory: string) {
    this.connectionState = {
      status: "connecting",
      baseUrl: this.getSettings().serverBaseUrl,
      managed: Boolean(this.server),
    };
    this.emitState();

    this.stopStream();
    this.currentDirectory = directory;
    const baseUrl = this.getSettings().serverBaseUrl;

    try {
      this.client = this.createClient(baseUrl, directory);
      await this.client.path.get(REQUEST_OPTIONS);
    } catch (error) {
      const settings = this.getSettings();
      if (!settings.autoStartServer) {
        this.connectionState = {
          status: "error",
          baseUrl,
          managed: false,
          error: this.formatError(error),
        };
        this.emitState();
        throw error;
      }

      const server = await this.startManagedServer();
      this.client = this.createClient(server.url, directory);
      await this.client.path.get(REQUEST_OPTIONS);
    }

    this.connectionState = {
      status: "connected",
      baseUrl: this.server?.url ?? baseUrl,
      managed: Boolean(this.server),
    };
    this.emitState();
    await this.startStream();
  }

  private createClient(baseUrl: string, directory: string) {
    return createOpencodeClient({
      baseUrl,
      directory,
      ...REQUEST_OPTIONS,
    });
  }

  private createV2Client(baseUrl: string, directory: string) {
    return createOpencodeV2Client({
      baseUrl,
      directory,
      ...REQUEST_OPTIONS,
    });
  }

  private async pingServer(baseUrl: string) {
    const client = createOpencodeClient({
      baseUrl,
      ...REQUEST_OPTIONS,
    });
    await client.path.get(REQUEST_OPTIONS);
  }

  private async refreshState() {
    const client = this.client;
    const directory = this.currentDirectory;
    if (!client || !directory) {
      return;
    }

    const v2Client = this.createV2Client(this.server?.url ?? this.getSettings().serverBaseUrl, directory);

    const [sessionsResult, statusesResult, providersResult, agentsResult, commandsResult, configResult, vcsResult, projectResult] = await Promise.all([
      client.session.list(REQUEST_OPTIONS),
      client.session.status(REQUEST_OPTIONS),
      v2Client.provider.list({ directory }, REQUEST_OPTIONS),
      v2Client.app.agents({ directory }, REQUEST_OPTIONS),
      client.command.list(REQUEST_OPTIONS),
      client.config.get(REQUEST_OPTIONS),
      v2Client.vcs.get({ directory }, REQUEST_OPTIONS).catch(() => undefined),
      v2Client.project.current({ directory }, REQUEST_OPTIONS).catch(() => undefined),
    ]);

    const sessions = this.unwrap(sessionsResult);
    const statuses = this.unwrap(statusesResult);
    const providers = this.unwrap(providersResult);
    const agents = this.unwrap(agentsResult);
    const commands = this.unwrap(commandsResult);
    const config = this.unwrap(configResult);
    const vcs = vcsResult ? this.unwrap(vcsResult) : undefined;
    const project = projectResult ? this.unwrap(projectResult) : null;

    this.sessions = [...sessions].sort((left, right) => right.time.updated - left.time.updated);
    this.sessionStatuses = new Map(Object.entries(statuses));
    this.commands = commands;
    this.agents = agents;
    this.providers = this.buildProviders(providers);
    this.models = this.flattenModels(providers);
    this.vcs = vcs;
    this.project = project;
    this.resolvedConfig = {
      model: config.model,
      small_model: config.small_model,
    };
    this.normalizeComposer(config.model, providers);
    this.lastError = undefined;

    if (!this.activeSessionId) {
      this.activeSessionId = this.getStoredActiveSessionId(this.currentDirectory)
        ?? this.getStoredLastSessionId(this.currentDirectory)
        ?? this.sessions[0]?.id;
    }

    if (this.activeSessionId && !this.sessions.some((item) => item.id === this.activeSessionId)) {
      this.activeSessionId = this.getStoredLastSessionId(this.currentDirectory)
        ?? this.sessions[0]?.id;
    }

    this.persistActiveSessionId();

    if (this.activeSessionId) {
      await this.loadActiveSession(this.activeSessionId);
    } else {
      this.thread = [];
      this.todos = [];
      this.diffs = [];
    }

    this.updateBusyPolling();
    this.emitState();
  }

  private normalizeComposer(configuredModel: Config["model"] | undefined, providers: V2ProviderListResponse) {
    const configured = this.parseConfiguredModel(configuredModel);
    const provider = this.resolveProviderChoice(configured, providers);

    if (!provider) {
      this.composer.providerID = undefined;
      this.composer.modelID = undefined;
      this.composer.agent = this.normalizeComposerAgent(this.composer.agent);
      this.composer.variant = undefined;
      return;
    }

    const model = this.resolveModelChoice(provider.id, configured, providers);
    this.composer.providerID = provider.id;
    this.composer.modelID = model?.modelID;
    this.composer.agent = this.normalizeComposerAgent(this.composer.agent);
    this.composer.variant = this.normalizeComposerVariant(model, this.composer.variant);
  }

  private parseConfiguredModel(modelRef: Config["model"] | undefined) {
    if (!modelRef) {
      return undefined;
    }

    const separator = modelRef.indexOf("/");
    if (separator === -1) {
      return undefined;
    }

    const providerID = modelRef.slice(0, separator).trim();
    const modelID = modelRef.slice(separator + 1).trim();
    if (!providerID || !modelID) {
      return undefined;
    }

    return { providerID, modelID };
  }

  private flattenModels(providers: V2ProviderListResponse) {
    const connected = new Set(providers.connected);
    const output: ModelOption[] = [];
    for (const provider of providers.all) {
      if (!connected.has(provider.id)) {
        continue;
      }
      for (const model of Object.values(provider.models)) {
        output.push(this.mapModel(provider.id, provider.name, model));
      }
    }

    return output.sort((left, right) => {
      const providerOrder = this.compareProviderIDs(left.providerID, right.providerID);
      if (providerOrder !== 0) {
        return providerOrder;
      }
      return left.label.localeCompare(right.label);
    });
  }

  private mapModel(providerID: string, providerName: string, model: ProviderCatalogModel): ModelOption {
    return {
      providerID,
      providerName,
      modelID: model.id,
      label: `${providerName} / ${model.name}`,
      status: model.status,
      variants: this.getModelVariants(model),
    };
  }

  private buildProviders(providers: V2ProviderListResponse) {
    const connected = new Set(providers.connected);
    return providers.all
      .filter((provider) => connected.has(provider.id))
      .map((provider) => ({
        id: provider.id,
        name: provider.name,
        modelCount: Object.keys(provider.models).length,
        defaultModelID: this.resolveProviderDefaultModelID(provider.id, providers),
      }))
      .sort((left, right) => this.compareProviderIDs(left.id, right.id) || left.name.localeCompare(right.name));
  }

  private getModelVariants(model: ProviderCatalogModel) {
    return Object.entries(model.variants ?? {})
      .filter(([, value]) => !this.isDisabledVariant(value))
      .map(([name]) => name)
      .sort((left, right) => this.compareVariantNames(left, right));
  }

  private isDisabledVariant(value: unknown) {
    if (!value || typeof value !== "object") {
      return false;
    }

    return "disabled" in value && Boolean((value as { disabled?: unknown }).disabled);
  }

  private compareVariantNames(left: string, right: string) {
    const order = ["low", "medium", "high", "xhigh", "max"];
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) {
        return 1;
      }
      if (rightIndex === -1) {
        return -1;
      }
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right);
  }

  private resolveProviderChoice(
    configured: { providerID: string; modelID: string } | undefined,
    providers: V2ProviderListResponse,
  ) {
    const connected = new Set(providers.connected);
    const currentProviderID = this.composer.providerID;

    if (currentProviderID && connected.has(currentProviderID)) {
      return this.providers.find((provider) => provider.id === currentProviderID);
    }

    if (configured && connected.has(configured.providerID)) {
      return this.providers.find((provider) => provider.id === configured.providerID);
    }

    return this.providers[0];
  }

  private resolveModelChoice(
    providerID: string,
    configured: { providerID: string; modelID: string } | undefined,
    providers: V2ProviderListResponse,
  ) {
    const providerModels = this.models.filter((item) => item.providerID === providerID);
    if (!providerModels.length) {
      return undefined;
    }

    const currentModel = this.composer.providerID === providerID
      ? providerModels.find((item) => item.modelID === this.composer.modelID)
      : undefined;
    if (currentModel) {
      return currentModel;
    }

    if (configured?.providerID === providerID) {
      const configuredModel = providerModels.find((item) => item.modelID === configured.modelID);
      if (configuredModel) {
        return configuredModel;
      }
    }

    const providerDefaultModelID = this.resolveProviderDefaultModelID(providerID, providers);
    if (providerDefaultModelID) {
      const providerDefaultModel = providerModels.find((item) => item.modelID === providerDefaultModelID);
      if (providerDefaultModel) {
        return providerDefaultModel;
      }
    }

    return providerModels[0];
  }

  private resolveProviderDefaultModelID(providerID: string, providers: V2ProviderListResponse) {
    const modelID = providers.default?.[providerID];
    if (!modelID) {
      return undefined;
    }

    const provider = providers.all.find((item) => item.id === providerID);
    if (!provider || !(modelID in provider.models)) {
      return undefined;
    }

    return modelID;
  }

  private compareProviderIDs(left: string, right: string) {
    const leftRank = left === "opencode" ? 0 : 1;
    const rightRank = right === "opencode" ? 0 : 1;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return left.localeCompare(right);
  }

  private async loadActiveSession(sessionId: string) {
    const client = this.client;
    if (!client) {
      return;
    }

    const [messagesResult, todosResult, diffsResult] = await Promise.all([
      client.session.messages({
        ...REQUEST_OPTIONS,
        path: { id: sessionId },
      }),
      client.session.todo({
        ...REQUEST_OPTIONS,
        path: { id: sessionId },
      }).catch(() => [] as Todo[]),
      client.session.diff({
        ...REQUEST_OPTIONS,
        path: { id: sessionId },
      }).catch(() => [] as FileDiff[]),
    ]);

    this.thread = this.unwrap(messagesResult);
    this.todos = this.unwrap(todosResult);
    this.diffs = this.unwrap(diffsResult);
    this.emitState();
  }

  private unwrap<T>(result: DataResult<T>) {
    if (result && typeof result === "object" && "data" in result) {
      return result.data as T;
    }
    return result as T;
  }

  private async startStream() {
    const client = this.client;
    if (!client) {
      return;
    }

    this.stopStream();
    const abort = new AbortController();
    this.streamAbort = abort;

    void (async () => {
      while (!abort.signal.aborted) {
        if (this.client !== client) {
          return;
        }

        try {
          const streamResult = await client.event.subscribe({
            ...REQUEST_OPTIONS,
            signal: abort.signal,
            onSseError: (error: unknown) => {
              if (abort.signal.aborted) {
                return;
              }

              const detail = `event stream transport error: ${this.formatError(error)}`;
              this.output.appendLine(`[event] ${detail}`);
              this.reportNetworkIssue(detail);
            },
          });

          if (abort.signal.aborted || this.client !== client) {
            return;
          }

          if (this.connectionState.status !== "connected") {
            this.connectionState = {
              status: "connected",
              baseUrl: this.connectionState.baseUrl,
              managed: this.connectionState.managed,
            };
            this.emitState();
          }

          for await (const event of streamResult.stream) {
            if (abort.signal.aborted || this.client !== client) {
              return;
            }
            await this.handleEvent(event as Event);
          }
        } catch (error) {
          if (abort.signal.aborted || this.client !== client) {
            return;
          }

          const detail = `event stream failed: ${this.formatError(error)}`;
          this.output.appendLine(`[event-loop] ${detail}`);
          this.reportNetworkIssue(detail);
        }

        if (abort.signal.aborted || this.client !== client) {
          return;
        }

        this.connectionState = {
          status: "connecting",
          baseUrl: this.connectionState.baseUrl,
          managed: this.connectionState.managed,
          error: "Reconnecting OpenCode event stream...",
        };
        this.emitState();
        await this.sleep(400, abort.signal);
      }
    })();
  }

  private stopStream() {
    this.streamAbort?.abort();
    this.streamAbort = undefined;
    this.stopBusyPolling();
  }

  private updateBusyPolling() {
    const sessionId = this.activeSessionId;
    if (!sessionId) {
      this.stopBusyPolling();
      return;
    }

    const status = this.sessionStatuses.get(sessionId);
    if (status?.type !== "busy") {
      this.stopBusyPolling();
      return;
    }

    if (this.busyPollTimer && this.busyPollSessionId === sessionId) {
      return;
    }

    this.stopBusyPolling();
    this.busyPollSessionId = sessionId;

    this.busyPollTimer = setInterval(() => {
      if (!this.busyPollSessionId) {
        return;
      }
      void this.pollBusySession(this.busyPollSessionId);
    }, 1200);

    void this.pollBusySession(sessionId);
  }

  private stopBusyPolling() {
    if (this.busyPollTimer) {
      clearInterval(this.busyPollTimer);
      this.busyPollTimer = undefined;
    }
    this.busyPollSessionId = undefined;
    this.busyPollPending = false;
  }

  private async pollBusySession(sessionId: string) {
    if (this.busyPollPending) {
      return;
    }

    if (sessionId !== this.activeSessionId) {
      this.stopBusyPolling();
      return;
    }

    if (sessionId !== this.busyPollSessionId) {
      return;
    }

    const status = this.sessionStatuses.get(sessionId);
    if (status?.type !== "busy") {
      this.stopBusyPolling();
      return;
    }

    this.busyPollPending = true;
    try {
      await this.loadActiveSession(sessionId);
    } catch (error) {
      this.output.appendLine(`[busy-poll] ${this.formatError(error)}`);
    } finally {
      this.busyPollPending = false;
    }
  }

  private async sleep(ms: number, signal: AbortSignal) {
    await new Promise<void>((resolve) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timeout);
        resolve();
      };

      signal.addEventListener("abort", onAbort, { once: true });
    });
  }

  private async handleEvent(event: Event) {
    switch (event.type) {
      case "server.connected": {
        this.connectionState = {
          status: "connected",
          baseUrl: this.connectionState.baseUrl,
          managed: this.connectionState.managed,
        };
        break;
      }
      case "session.created":
      case "session.updated": {
        this.upsertSession(event.properties.info);
        break;
      }
      case "session.deleted": {
        this.sessions = this.sessions.filter((item) => item.id !== event.properties.info.id);
        if (this.activeSessionId === event.properties.info.id) {
          this.activeSessionId = this.sessions[0]?.id;
          this.updateBusyPolling();
          if (this.activeSessionId) {
            await this.loadActiveSession(this.activeSessionId);
          } else {
            this.thread = [];
            this.todos = [];
            this.diffs = [];
          }
        }
        break;
      }
      case "session.status": {
        this.sessionStatuses.set(event.properties.sessionID, event.properties.status);
        this.updateBusyPolling();
        break;
      }
      case "session.idle": {
        this.sessionStatuses.set(event.properties.sessionID, { type: "idle" });
        this.updateBusyPolling();
        if (event.properties.sessionID === this.activeSessionId) {
          await this.loadActiveSession(event.properties.sessionID);
        }
        break;
      }
      case "message.updated": {
        this.upsertMessage(event.properties.info);
        break;
      }
      case "message.removed": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.thread = this.thread.filter((item) => item.info.id !== event.properties.messageID);
        }
        break;
      }
      case "message.part.updated": {
        this.upsertPart(event.properties.part, event.properties.delta);
        break;
      }
      case "message.part.removed": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.thread = this.thread.map((entry) => {
            if (entry.info.id !== event.properties.messageID) {
              return entry;
            }
            return {
              ...entry,
              parts: entry.parts.filter((part) => part.id !== event.properties.partID),
            };
          });
        }
        break;
      }
      case "permission.updated": {
        this.permissions.set(event.properties.id, event.properties);
        break;
      }
      case "permission.replied": {
        this.permissions.delete(event.properties.permissionID);
        break;
      }
      case "todo.updated": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.todos = event.properties.todos;
        }
        break;
      }
      case "session.diff": {
        if (event.properties.sessionID === this.activeSessionId) {
          this.diffs = event.properties.diff;
        }
        break;
      }
      case "session.error": {
        this.lastError = this.formatSessionError(event.properties.error);
        if (event.properties.sessionID) {
          this.sessionStatuses.set(event.properties.sessionID, { type: "idle" });
        }
        this.updateBusyPolling();
        break;
      }
      case "session.compacted": {
        if (event.properties.sessionID === this.activeSessionId) {
          await this.loadActiveSession(event.properties.sessionID);
        }
        break;
      }
      default:
        break;
    }

    this.emitState();
  }

  private formatSessionError(error: unknown) {
    if (!error || typeof error !== "object") {
      return undefined;
    }
    if ("data" in error && error.data && typeof error.data === "object" && "message" in error.data) {
      return String(error.data.message);
    }
    if ("name" in error) {
      return String(error.name);
    }
    return "OpenCode reported an error.";
  }

  private upsertSession(session: Session) {
    const index = this.sessions.findIndex((item) => item.id === session.id);
    if (index === -1) {
      this.sessions = [session, ...this.sessions];
    } else {
      this.sessions = [
        ...this.sessions.slice(0, index),
        session,
        ...this.sessions.slice(index + 1),
      ];
    }
    this.sessions = [...this.sessions].sort((left, right) => right.time.updated - left.time.updated);
  }

  private upsertMessage(message: Message) {
    if (message.sessionID !== this.activeSessionId) {
      return;
    }

    const index = this.thread.findIndex((entry) => entry.info.id === message.id);
    if (index === -1) {
      this.thread = [...this.thread, { info: message, parts: [] }];
      return;
    }

    const current = this.thread[index];
    this.thread = [
      ...this.thread.slice(0, index),
      { ...current, info: message },
      ...this.thread.slice(index + 1),
    ];
  }

  private upsertPart(part: Part, delta?: string) {
    if (part.sessionID !== this.activeSessionId) {
      return;
    }

    const messageIndex = this.thread.findIndex((entry) => entry.info.id === part.messageID);
    if (messageIndex === -1) {
      return;
    }

    const message = this.thread[messageIndex];
    const partIndex = message.parts.findIndex((item) => item.id === part.id);
    if (typeof delta === "string" && delta && (part.type === "text" || part.type === "reasoning")) {
      const nextText = typeof part.text === "string" ? part.text : "";

      if (partIndex === -1) {
        if (!nextText) {
          part = {
            ...part,
            text: delta,
          };
        }
      } else {
        const currentPart = message.parts[partIndex];
        if (currentPart?.type === "text" || currentPart?.type === "reasoning") {
          const currentText = typeof currentPart.text === "string" ? currentPart.text : "";
          if (nextText === currentText) {
            part = {
              ...part,
              text: currentText + delta,
            };
          }
        }
      }
    }

    const nextParts = partIndex === -1
      ? [...message.parts, part]
      : [
          ...message.parts.slice(0, partIndex),
          part,
          ...message.parts.slice(partIndex + 1),
        ];

    this.thread = [
      ...this.thread.slice(0, messageIndex),
      { ...message, parts: nextParts },
      ...this.thread.slice(messageIndex + 1),
    ];
  }

  private getActivePermissions() {
    if (!this.activeSessionId) {
      return [];
    }

    return [...this.permissions.values()].filter((item) => item.sessionID === this.activeSessionId);
  }

  public getWorkspaceContext(): WorkspaceContext {
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const activeFolder = activeUri ? vscode.workspace.getWorkspaceFolder(activeUri) : undefined;
    const folder = activeFolder ?? vscode.workspace.workspaceFolders?.[0];

    if (!folder) {
      return {
        hasWorkspace: false,
        name: "No workspace",
      };
    }

    return {
      hasWorkspace: true,
      name: folder.name,
      directory: folder.uri.fsPath,
    };
  }

  private getSettings() {
    const config = vscode.workspace.getConfiguration("opencodeVisual");
    return {
      opencodePath: config.get<string>("opencodePath", "opencode"),
      serverBaseUrl: config.get<string>("serverBaseUrl", "http://127.0.0.1:4096"),
      autoStartServer: config.get<boolean>("autoStartServer", true),
      debugServerLogs: config.get<boolean>("debugServerLogs", false),
    };
  }

  private async startManagedServer() {
    this.stopServer();
    const settings = this.getSettings();
    const targetUrl = new URL(settings.serverBaseUrl);
    const preferredPort = Number(targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80));

    try {
      return await this.spawnManagedServer(targetUrl.hostname, preferredPort, settings);
    } catch (error) {
      const fallbackPort = await this.findAvailablePort(targetUrl.hostname);
      if (!fallbackPort || fallbackPort === preferredPort) {
        throw error;
      }

      this.output.appendLine(
        `[server] Failed to start on ${preferredPort}. Retrying on free port ${fallbackPort}.`,
      );
      return await this.spawnManagedServer(targetUrl.hostname, fallbackPort, settings);
    }
  }

  private async spawnManagedServer(
    hostname: string,
    port: number,
    settings: ReturnType<OpenCodeService["getSettings"]>,
  ) {
    const args = [
      "serve",
      `--hostname=${hostname}`,
      `--port=${String(port)}`,
      "--print-logs",
    ];

    const env = this.buildManagedServerEnv();
    const command = await this.resolveOpencodeCommand(settings.opencodePath, env.PATH);
    const proc = spawn(command, args, {
      cwd: this.currentDirectory,
      env,
      shell: process.platform === "win32" && (!this.looksLikeFilePath(command) || this.requiresWindowsShell(command)),
      stdio: "pipe",
    });

    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.killManagedServerProcess(proc);
        reject(new Error("Timed out while starting the OpenCode server."));
      }, 10000);
      let output = "";
      let resolved = false;

      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        output += text;
        if (settings.debugServerLogs) {
          this.output.append(text);
        }
        if (resolved) {
          return;
        }

        const lines = output.split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/opencode server listening on\s+(https?:\/\/[^\s]+)/i);
          if (match) {
            resolved = true;
            clearTimeout(timeout);
            resolve(match[1]);
            return;
          }
        }
      };

      proc.stdout.on("data", onData);
      proc.stderr.on("data", onData);
      proc.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      proc.on("exit", (code) => {
        if (resolved) {
          return;
        }
        clearTimeout(timeout);
        reject(new Error(`OpenCode server exited early with code ${code}. ${output}`.trim()));
      });
    });

    this.server = {
      process: proc,
      url,
    };

    return this.server;
  }

  private async findAvailablePort(hostname: string) {
    return await new Promise<number>((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on("error", reject);
      server.listen(0, hostname, () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close(() => reject(new Error("Failed to determine an available local port.")));
          return;
        }
        const { port } = address;
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(port);
        });
      });
    });
  }

  private stopServer() {
    if (!this.server) {
      return;
    }

    this.killManagedServerProcess(this.server.process);
    this.server = undefined;
  }

  private killManagedServerProcess(proc: ChildProcessWithoutNullStreams) {
    if (proc.killed) {
      return;
    }

    if (process.platform === "win32" && proc.pid) {
      spawn("taskkill", ["/pid", String(proc.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      }).on("error", () => {
        proc.kill();
      });
      return;
    }

    proc.kill();
  }

  private buildManagedServerEnv() {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
    };

    if (process.platform === "win32") {
      return env;
    }

    const current = this.splitPathEntries(env.PATH);
    const extras = this.getCommonBinaryDirectories();
    for (const entry of extras) {
      if (!current.includes(entry)) {
        current.push(entry);
      }
    }

    env.PATH = current.join(path.delimiter);
    return env;
  }

  private getCommonBinaryDirectories() {
    if (process.platform === "win32") {
      return [];
    }

    const home = os.homedir();
    const candidates = [
      "/opt/homebrew/sbin",
      "/opt/homebrew/bin",
      "/usr/local/sbin",
      "/usr/local/bin",
      "/usr/sbin",
      "/usr/bin",
      "/snap/bin",
      "/var/lib/snapd/snap/bin",
      home ? path.join(home, ".local", "bin") : "",
      home ? path.join(home, ".bun", "bin") : "",
      home ? path.join(home, ".cargo", "bin") : "",
      home ? path.join(home, "bin") : "",
    ];

    return candidates.filter((entry) => Boolean(entry) && fs.existsSync(entry));
  }

  private splitPathEntries(value: string | undefined) {
    return (value ?? "")
      .split(path.delimiter)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private looksLikeFilePath(value: string) {
    return value.startsWith("~") || path.isAbsolute(value) || value.includes("/") || value.includes("\\");
  }

  private requiresWindowsShell(value: string) {
    if (process.platform !== "win32") {
      return false;
    }

    const ext = path.extname(value).toLowerCase();
    return ext === ".cmd" || ext === ".bat";
  }

  private expandHomeDirectory(value: string) {
    if (!value.startsWith("~")) {
      return value;
    }

    const home = os.homedir();
    if (!home) {
      return value;
    }

    if (value === "~") {
      return home;
    }

    if (value.startsWith("~/") || value.startsWith("~\\")) {
      return path.join(home, value.slice(2));
    }

    return value;
  }

  private async resolveOpencodeCommand(configuredPath: string, envPath: string | undefined) {
    const configured = (configuredPath || "opencode").trim() || "opencode";
    const expanded = this.expandHomeDirectory(configured);

    if (this.looksLikeFilePath(expanded)) {
      if (await this.fileCanExecute(expanded)) {
        return expanded;
      }
      throw new Error(`OpenCode executable not found at configured path: ${expanded}`);
    }

    const fromPath = await this.resolveCommandFromPath(expanded, envPath);
    if (fromPath) {
      return fromPath;
    }

    if (expanded === "opencode") {
      const fromWellKnown = await this.resolveFromWellKnownLocations();
      if (fromWellKnown) {
        return fromWellKnown;
      }
    }

    const fromShell = await this.resolveCommandFromLoginShell(expanded);
    if (fromShell) {
      return fromShell;
    }

    return expanded;
  }

  private async resolveCommandFromPath(command: string, pathValue: string | undefined) {
    const directories = this.splitPathEntries(pathValue);
    if (directories.length === 0) {
      return undefined;
    }

    const hasExt = path.extname(command).length > 0;
    let pathExtensions = process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
      : [];
    if (process.platform === "win32" && !hasExt) {
      const preferredExtensions = [".CMD", ".EXE", ".BAT", ".COM"];
      pathExtensions = [
        ...preferredExtensions,
        ...pathExtensions.filter((ext) => !preferredExtensions.includes(ext.toUpperCase())),
      ];
    }

    for (const directory of directories) {
      const base = path.join(directory, command);
      const candidates = process.platform === "win32" && !hasExt
        ? pathExtensions.map((ext) => `${base}${ext}`)
        : [base];

      for (const candidate of candidates) {
        if (await this.fileCanExecute(candidate)) {
          return candidate;
        }
      }
    }

    return undefined;
  }

  private async fileCanExecute(filePath: string) {
    const mode = process.platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK;
    try {
      await fs.promises.access(filePath, mode);
      return true;
    } catch {
      return false;
    }
  }

  private async resolveFromWellKnownLocations() {
    const candidates: string[] = [];
    const home = os.homedir();

    if (process.platform === "win32") {
      if (process.env.APPDATA) {
        candidates.push(path.join(process.env.APPDATA, "npm", "opencode.cmd"));
      }
      if (process.env.LOCALAPPDATA) {
        candidates.push(path.join(process.env.LOCALAPPDATA, "Programs", "opencode", "opencode.exe"));
      }
      if (home) {
        candidates.push(path.join(home, "scoop", "shims", "opencode.exe"));
      }
    } else {
      candidates.push(
        "/opt/homebrew/bin/opencode",
        "/usr/local/bin/opencode",
        "/usr/bin/opencode",
        "/snap/bin/opencode",
        "/var/lib/snapd/snap/bin/opencode",
      );

      if (home) {
        candidates.push(
          path.join(home, ".local", "bin", "opencode"),
          path.join(home, "bin", "opencode"),
        );
      }
    }

    for (const candidate of candidates) {
      if (await this.fileCanExecute(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  private async resolveCommandFromLoginShell(command: string) {
    if (process.platform === "win32") {
      return undefined;
    }

    if (!/^[A-Za-z0-9._-]+$/.test(command)) {
      return undefined;
    }

    const shell = process.env.SHELL;
    if (!shell) {
      return undefined;
    }

    const located = await new Promise<string | undefined>((resolve) => {
      const proc = spawn(shell, ["-ilc", `command -v ${command}`], {
        env: {
          ...process.env,
        },
        stdio: ["ignore", "pipe", "ignore"],
      });

      const timeout = setTimeout(() => {
        proc.kill();
        resolve(undefined);
      }, COMMAND_LOOKUP_TIMEOUT_MS);

      let stdout = "";
      proc.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      proc.on("error", () => {
        clearTimeout(timeout);
        resolve(undefined);
      });
      proc.on("exit", () => {
        clearTimeout(timeout);
        const candidate = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => line.startsWith("/") || /^[A-Za-z]:[\\/]/.test(line));
        resolve(candidate ? this.expandHomeDirectory(candidate) : undefined);
      });
    });

    if (!located) {
      return undefined;
    }

    if (await this.fileCanExecute(located)) {
      return located;
    }

    return undefined;
  }

  private formatError(error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    if (/executable not found at configured path:/i.test(text)) {
      return `${text}. Update opencodeVisual.opencodePath to a valid executable path.`;
    }

    if (/enoent|not recognized as an internal or external command|spawn\s+.*\s+enoent/i.test(text)) {
      return "OpenCode CLI was not found. Install OpenCode or set opencodeVisual.opencodePath to the full executable path.";
    }

    if (/timed out while starting the opencode server/i.test(text)) {
      return "Timed out while starting OpenCode server. Verify `opencode serve` works in a terminal and that localhost is reachable.";
    }

    return text;
  }

  private getNetworkHint(detail: string) {
    if (/executable not found at configured path:/i.test(detail)) {
      return "Configured OpenCode path is invalid. Update `opencodeVisual.opencodePath` to a valid executable path.";
    }

    if (/enoent|not found|not recognized as an internal or external command|spawn\s+.*\s+enoent/i.test(detail)) {
      return "OpenCode CLI is not available to VS Code. Set `opencodeVisual.opencodePath` to the full path (for example `/opt/homebrew/bin/opencode` or `~/.local/bin/opencode`).";
    }

    if (/econnrefused|econnreset|econnaborted|fetch failed|timed out|enotfound|eai_again|socket|network error/i.test(detail.toLowerCase())) {
      return "OpenCode server is unreachable. Check `opencodeVisual.serverBaseUrl`, then restart the local server from the command palette.";
    }

    return "OpenCode request failed. Open extension output for diagnostics.";
  }

  private emitState() {
    this.stateEmitter.fire(this.getState());
  }

  private persistActiveSessionId() {
    const key = this.getActiveSessionStorageKey(this.currentDirectory);
    if (!key) {
      return;
    }

    void this.context.workspaceState.update(key, this.activeSessionId ?? null);

    const last = this.getLastSessionStorageKey(this.currentDirectory);
    if (last) {
      void this.context.workspaceState.update(last, this.activeSessionId ?? null);
    }
  }

  private getStoredActiveSessionId(directory?: string) {
    const key = this.getActiveSessionStorageKey(directory);
    if (!key) {
      return undefined;
    }
    return this.context.workspaceState.get<string>(key);
  }

  private getStoredLastSessionId(directory?: string) {
    const key = this.getLastSessionStorageKey(directory);
    if (!key) {
      return undefined;
    }

    return this.context.workspaceState.get<string>(key);
  }

  private getActiveSessionStorageKey(directory?: string) {
    const normalized = this.normalizeDirectoryForKey(directory);
    if (!normalized) {
      return undefined;
    }
    return `${ACTIVE_SESSION_STORAGE_PREFIX}:${normalized}`;
  }

  private getLastSessionStorageKey(directory?: string) {
    if (!directory) {
      return undefined;
    }

    const root = this.projectRoot(directory);
    if (!root) {
      return undefined;
    }

    return `${LAST_SESSION_STORAGE_PREFIX}:${root}`;
  }

  private projectRoot(directory?: string) {
    if (!directory) return undefined;
    const project = this.project;
    if (!project?.worktree) {
      return this.normalizeDirectoryForKey(directory);
    }

    const roots = [project.worktree, ...(project.sandboxes ?? [])];
    const root = roots.find((item) => sameWorkspace(item, directory));
    return this.normalizeDirectoryForKey(root ?? directory);
  }

  private normalizeDirectoryForKey(directory?: string) {
    if (!directory) {
      return undefined;
    }

    const resolved = path.resolve(directory);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  }

  private sameDirectory(left?: string, right?: string) {
    return this.normalizeDirectoryForKey(left) === this.normalizeDirectoryForKey(right);
  }
}
