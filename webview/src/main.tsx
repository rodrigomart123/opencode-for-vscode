import { render } from "solid-js/web";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { MemoryRouter, useNavigate } from "@solidjs/router";
import { base64Encode } from "@opencode-ai/util/encode";
import { AppBaseProviders, AppInterface } from "@/app";
import { useCommand } from "@/context/command";
import { type ExtensionSettingKey, type ExtensionSettings, type Platform, PlatformProvider } from "@/context/platform";
import { ServerConnection } from "@/context/server";
import { useTheme } from "@opencode-ai/ui/theme/context";
import type { HostAction, HostToWebviewMessage, WebviewToHostMessage } from "../../src/webviewProtocol";

declare global {
  interface Window {
    __OPENCODE_VSCODE_CONFIG__?: {
      serverUrl: string;
      version: string;
      workspaceDirectory: string | null;
      colorScheme: "light" | "dark";
      disableHealthCheck?: boolean;
      settingsMode?: boolean;
    };
    acquireVsCodeApi?: () => {
      postMessage: (message: WebviewToHostMessage) => void;
    };
  }
}

const root = document.getElementById("root");
if (!(root instanceof HTMLElement)) {
  throw new Error("OpenCode webview root not found.");
}
const rootEl = root;

const cfg = window.__OPENCODE_VSCODE_CONFIG__;
if (!cfg || !cfg.serverUrl) {
  throw new Error("OpenCode webview server URL is missing.");
}
const config = cfg;

const vscode = window.acquireVsCodeApi?.();
const nativeFetch = globalThis.fetch.bind(globalThis);
const DEFAULT_SERVER_URL_KEY = "opencode.settings.dat:defaultServerUrl";
const LAST_SESSION_KEY = "opencode.global.dat:layout.page";
const pending = new Map<string, (value: string | string[] | null) => void>();
const requests = new Map<string, {
  resolve: (value: Response | PromiseLike<Response>) => void;
  reject: (reason?: unknown) => void;
  controller?: ReadableStreamDefaultController<Uint8Array>;
  responded: boolean;
  timeout?: ReturnType<typeof setTimeout>;
}>();
const extensionRequests = new Map<string, {
  resolve: (value: ExtensionSettings | null) => void;
  reject: (reason?: unknown) => void;
  timeout?: ReturnType<typeof setTimeout>;
}>();
const restartRequests = new Map<string, {
  resolve: () => void;
  reject: (reason?: unknown) => void;
  timeout?: ReturnType<typeof setTimeout>;
}>();
const hostActionListeners = new Set<(action: HostAction) => void>();
const pendingHostActions: HostAction[] = [];
let hostMessageBridgeStarted = false;
const [hostScheme, setHostScheme] = createSignal<"light" | "dark">(config.colorScheme);
const FETCH_HEADER_TIMEOUT_MS = 20000;
const EXTENSION_SETTINGS_TIMEOUT_MS = 10000;
const settingsMode = Boolean(config.settingsMode);
const SETTINGS_MODE_STYLE_ID = "opencode-settings-mode-style";

function requestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function encode(bytes: ArrayBuffer) {
  let value = "";
  const data = new Uint8Array(bytes);
  for (let index = 0; index < data.length; index += 1) {
    value += String.fromCharCode(data[index]);
  }
  return btoa(value);
}

function decode(value: string) {
  const text = atob(value);
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index);
  }
  return bytes;
}

function abortError(message = "The operation was aborted") {
  try {
    return new DOMException(message, "AbortError");
  } catch {
    const error = new Error(message);
    error.name = "AbortError";
    return error;
  }
}

function fetchHint(message: string, name?: string) {
  if (name === "AbortError") {
    return message;
  }

  const text = message.toLowerCase();
  if (/enoent|not recognized as an internal or external command|spawn\s+.*\s+enoent/.test(text)) {
    return "OpenCode CLI was not found. Set opencodeVisual.opencodePath to your opencode executable.";
  }

  if (/econnrefused|fetch failed|timed out|enotfound|eai_again|socket|networkerror/.test(text)) {
    return "Could not reach OpenCode server. Check opencodeVisual.serverBaseUrl and restart the local server.";
  }

  return message;
}

function fetchError(message: string, name?: string) {
  if (name === "AbortError") {
    return abortError(message || "The operation was aborted");
  }

  const hint = fetchHint(message, name);
  const error = new TypeError(hint);
  if (name && name !== "TypeError") {
    try {
      Object.defineProperty(error, "name", {
        value: name,
      });
    } catch {
      error.name = name;
    }
  }
  return error;
}

function aliasServerUrl(input: string) {
  try {
    const url = new URL(input);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
      url.hostname = "opencode.localhost";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return input;
  }
}

function handleHostMessage(message: HostToWebviewMessage) {
  if (message.type === "hostTheme") {
    setHostScheme(message.colorScheme);
    return true;
  }

  if (message.type === "pickDirectoryResult") {
    const resolve = pending.get(message.requestId);
    if (!resolve) return true;
    pending.delete(message.requestId);
    resolve(message.value);
    return true;
  }

  if (message.type === "fetchResponse") {
    const request = requests.get(message.requestId);
    if (!request) return true;

    request.responded = true;
    if (request.timeout) {
      clearTimeout(request.timeout);
      request.timeout = undefined;
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        request.controller = controller;
      },
      cancel() {
        if (request.timeout) {
          clearTimeout(request.timeout);
          request.timeout = undefined;
        }
        requests.delete(message.requestId);
        vscode?.postMessage({ type: "fetchAbort", requestId: message.requestId });
      },
    });

    request.resolve(new Response(stream, {
      status: message.status,
      statusText: message.statusText,
      headers: message.headers,
    }));
    return true;
  }

  if (message.type === "fetchChunk") {
    const request = requests.get(message.requestId);
    request?.controller?.enqueue(decode(message.chunk));
    return true;
  }

  if (message.type === "fetchEnd") {
    const request = requests.get(message.requestId);
    if (request?.timeout) {
      clearTimeout(request.timeout);
      request.timeout = undefined;
    }
    request?.controller?.close();
    requests.delete(message.requestId);
    return true;
  }

  if (message.type === "fetchError") {
    const request = requests.get(message.requestId);
    if (!request) return true;
    if (request.timeout) {
      clearTimeout(request.timeout);
      request.timeout = undefined;
    }
    const error = fetchError(message.message, message.name);
    if (request.controller) {
      request.controller.error(error);
    } else {
      request.reject(error);
    }
    requests.delete(message.requestId);
    return true;
  }

  if (message.type === "extensionSettingsResult" || message.type === "extensionSettingResult") {
    const request = extensionRequests.get(message.requestId);
    if (!request) return true;

    if (request.timeout) {
      clearTimeout(request.timeout);
      request.timeout = undefined;
    }

    extensionRequests.delete(message.requestId);
    if (message.error) {
      request.reject(new Error(message.error));
      return true;
    }

    request.resolve(message.value);
    return true;
  }

  if (message.type === "restartServerResult") {
    const request = restartRequests.get(message.requestId);
    if (!request) return true;

    if (request.timeout) {
      clearTimeout(request.timeout);
      request.timeout = undefined;
    }

    restartRequests.delete(message.requestId);
    if (message.error) {
      request.reject(new Error(message.error));
      return true;
    }

    request.resolve();
    return true;
  }

  return false;
}

function extensionRequest(message: Extract<WebviewToHostMessage, {
  type: "getExtensionSettings";
} | {
  type: "setExtensionSetting";
}>) {
  if (!vscode) {
    return Promise.resolve<ExtensionSettings | null>(null);
  }

  return new Promise<ExtensionSettings | null>((resolve, reject) => {
    const request = {
      resolve,
      reject,
      timeout: setTimeout(() => {
        const current = extensionRequests.get(message.requestId);
        if (!current) {
          return;
        }

        extensionRequests.delete(message.requestId);
        current.reject(new Error("Timed out while waiting for extension settings response."));
      }, EXTENSION_SETTINGS_TIMEOUT_MS),
    };

    extensionRequests.set(message.requestId, request);
    vscode.postMessage(message);
  });
}

function restartRequest(message: Extract<WebviewToHostMessage, { type: "restartServer" }>) {
  if (!vscode) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const request = {
      resolve,
      reject,
      timeout: setTimeout(() => {
        const current = restartRequests.get(message.requestId);
        if (!current) {
          return;
        }

        restartRequests.delete(message.requestId);
        current.reject(new Error("Timed out while waiting for server restart response."));
      }, EXTENSION_SETTINGS_TIMEOUT_MS),
    };

    restartRequests.set(message.requestId, request);
    vscode.postMessage(message);
  });
}

function startHostMessageBridge() {
  if (hostMessageBridgeStarted) {
    return;
  }

  hostMessageBridgeStarted = true;
  window.addEventListener("message", (event: MessageEvent<HostToWebviewMessage>) => {
    if (handleHostMessage(event.data)) {
      return;
    }

    if (event.data?.type !== "hostAction") {
      return;
    }

    if (hostActionListeners.size === 0) {
      pendingHostActions.push(event.data.action);
      return;
    }

    for (const listener of hostActionListeners) {
      listener(event.data.action);
    }
  });

  vscode?.postMessage({ type: "webviewReady" });
}

function shouldBridge(input: RequestInfo | URL) {
  try {
    const url = input instanceof Request
      ? new URL(input.url)
      : input instanceof URL
        ? input
        : new URL(String(input), window.location.href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function hostFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (!vscode || !shouldBridge(input)) {
    return nativeFetch(input, init);
  }

  const request = input instanceof Request ? input : new Request(input, init);
  if (request.signal.aborted) {
    throw abortError();
  }
  const id = requestId();
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : encode(await request.clone().arrayBuffer());

  const promise = new Promise<Response>((resolve, reject) => {
    requests.set(id, { resolve, reject, responded: false });
  });

  const requestState = requests.get(id);
  if (requestState) {
    requestState.timeout = setTimeout(() => {
      const current = requests.get(id);
      if (!current || current.responded) {
        return;
      }

      requests.delete(id);
      current.reject(fetchError("OpenCode request timed out before response headers were received."));
      vscode.postMessage({ type: "fetchAbort", requestId: id });
    }, FETCH_HEADER_TIMEOUT_MS);
  }

  request.signal.addEventListener("abort", () => {
    const current = requests.get(id);
    if (!current) {
      return;
    }

    if (current.timeout) {
      clearTimeout(current.timeout);
      current.timeout = undefined;
    }

    requests.delete(id);
    const error = abortError();
    if (current.controller) {
      current.controller.error(error);
    } else {
      current.reject(error);
    }
    vscode.postMessage({ type: "fetchAbort", requestId: id });
  }, { once: true });

  vscode.postMessage({
    type: "fetchRequest",
    requestId: id,
    url: request.url,
    method: request.method,
    headers: [...request.headers.entries()],
    body,
  });

  return promise;
}

globalThis.fetch = hostFetch;

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function readDefaultServerKey() {
  const value = readStorage(DEFAULT_SERVER_URL_KEY);
  if (!value) {
    return null;
  }

  const normalized = aliasServerUrl(value);
  if (normalized !== value) {
    writeStorage(DEFAULT_SERVER_URL_KEY, normalized);
  }
  return normalized;
}

function key(dir: string) {
  const value = dir.replaceAll("\\", "/");
  const drive = value.match(/^([A-Za-z]:)\/+$/);
  if (drive) return `${drive[1]}/`;
  if (/^\/+$/i.test(value)) return "/";
  return value.replace(/\/+$/, "");
}

function windows(dir: string) {
  return /^[A-Za-z]:/.test(dir) || dir.startsWith("//");
}

function same(left: string, right: string) {
  const a = key(left);
  const b = key(right);
  if (windows(a) || windows(b)) return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

function dirs(directory: string) {
  const found = new Set<string>([directory]);
  const match = directory.match(/^([A-Za-z]):([\\/].*)$/);
  if (!match) return [...found];
  const rest = match[2];
  if (!rest) return [...found];
  const slash = rest.replaceAll("\\", "/");
  const back = rest.replaceAll("/", "\\");
  found.add(`${match[1]?.toUpperCase()}:${back}`);
  found.add(`${match[1]?.toUpperCase()}:${slash}`);
  found.add(`${match[1]?.toLowerCase()}:${back}`);
  found.add(`${match[1]?.toLowerCase()}:${slash}`);
  return [...found];
}

function readLastSession(directory: string) {
  const raw = readStorage(LAST_SESSION_KEY);
  if (!raw) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  if (!parsed || typeof parsed !== "object") return;
  const map = (parsed as { lastProjectSession?: unknown }).lastProjectSession;
  if (!map || typeof map !== "object") return;

  let latest: { directory: string; id: string; at: number } | undefined;
  for (const [root, value] of Object.entries(map as Record<string, unknown>)) {
    if (!same(root, directory)) continue;
    if (!value || typeof value !== "object") continue;

    const item = value as { directory?: unknown; id?: unknown; at?: unknown };
    if (typeof item.directory !== "string" || typeof item.id !== "string") continue;
    if (!same(item.directory, directory)) continue;

    const at = typeof item.at === "number" ? item.at : 0;
    if (!latest || at > latest.at) {
      latest = { directory: item.directory, id: item.id, at };
    }
  }

  return latest;
}

async function hasSession(directory: string, id: string) {
  for (const dir of dirs(directory)) {
    try {
      const url = new URL(`/session/${encodeURIComponent(id)}`, config.serverUrl);
      url.searchParams.set("directory", dir);
      const response = await hostFetch(url.toString(), { method: "GET" });
      if (response.ok) return true;
    } catch {
      continue;
    }
  }
  return false;
}

async function latestSessionID(directory: string) {
  for (const dir of dirs(directory)) {
    try {
      const url = new URL("/session", config.serverUrl);
      url.searchParams.set("directory", dir);
      url.searchParams.set("roots", "true");
      url.searchParams.set("limit", "1");

      const response = await hostFetch(url.toString(), { method: "GET" });
      if (!response.ok) continue;

      const body = await response.json().catch(() => undefined);
      const list = Array.isArray(body)
        ? body
        : body && typeof body === "object" && "data" in body && Array.isArray((body as { data?: unknown }).data)
          ? ((body as { data: unknown[] }).data ?? [])
          : [];

      const first = list[0] as { id?: unknown } | undefined;
      if (first && typeof first.id === "string") return first.id;
    } catch {
      continue;
    }
  }

  return undefined;
}

async function startupPath(directory: string) {
  const slug = base64Encode(directory);
  const saved = readLastSession(directory);
  if (saved && (await hasSession(saved.directory, saved.id))) {
    return `/${slug}/session/${saved.id}`;
  }

  const latest = await latestSessionID(directory);
  if (latest) return `/${slug}/session/${latest}`;
  return `/${slug}/session`;
}

const notify: Platform["notify"] = async (title, description) => {
  if (!("Notification" in window)) return;
  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission().catch(() => "denied")
      : Notification.permission;

  if (permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;

  await Promise.resolve().then(() => {
    new Notification(title, {
      body: description ?? "",
      icon: "https://opencode.ai/favicon-96x96-v3.png",
    });
  }).catch(() => undefined);
};

const platform: Platform = {
  platform: "web",
  version: config.version,
  openLink(url) {
    if (vscode) {
      vscode.postMessage({ type: "openLink", url });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  },
  openDiff(input) {
    if (!vscode) return Promise.resolve();
    vscode.postMessage({
      type: "openDiff",
      filePath: input.filePath,
      before: input.before,
      after: input.after,
    });
    return Promise.resolve();
  },
  back() {
    window.history.back();
  },
  forward() {
    window.history.forward();
  },
  restart: async () => {
    window.location.reload();
  },
  notify,
  fetch: hostFetch,
  openDirectoryPickerDialog(opts) {
    if (!vscode) return Promise.resolve(null);
    return new Promise((resolve) => {
      const id = requestId();
      pending.set(id, resolve);
      vscode.postMessage({
        type: "pickDirectory",
        requestId: id,
        title: opts?.title,
        multiple: opts?.multiple ?? false,
      });
    });
  },
  getDefaultServer: async () => {
    const value = readDefaultServerKey();
    return value ? ServerConnection.Key.make(value) : null;
  },
  setDefaultServer(url) {
    writeStorage(DEFAULT_SERVER_URL_KEY, url ? aliasServerUrl(url) : null);
  },
  getExtensionSettings: async () => {
    const id = requestId();
    return extensionRequest({ type: "getExtensionSettings", requestId: id });
  },
  setExtensionSetting: async (key: ExtensionSettingKey, value: string | boolean) => {
    const id = requestId();
    return extensionRequest({ type: "setExtensionSetting", requestId: id, key, value });
  },
  restartServerProcess: async () => {
    const id = requestId();
    return restartRequest({ type: "restartServer", requestId: id });
  },
};

if (!settingsMode) {
  platform.openSettings = () => {
    if (!vscode) return Promise.resolve();
    vscode.postMessage({ type: "openSettings" });
    return Promise.resolve();
  };
}

startHostMessageBridge();

function HostBridge() {
  const command = useCommand();
  const navigate = useNavigate();
  let dead = false;
  let booted = false;
  let opening = false;

  const openSettingsDialog = () => {
    command.trigger("settings.open", "palette");
  };

  const setSettingsReady = (ready: boolean) => {
    if (!settingsMode) {
      return;
    }

    rootEl.dataset.settingsReady = ready ? "true" : "false";
  };

  const applySettingsModeStyle = () => {
    const existing = document.getElementById(SETTINGS_MODE_STYLE_ID);
    if (existing) {
      return existing;
    }

    const style = document.createElement("style");
    style.id = SETTINGS_MODE_STYLE_ID;
    style.textContent = `
[data-tauri-drag-region] { display: none !important; }
[data-component='sidebar-nav-desktop'],
[data-component='sidebar-nav-mobile'],
[data-component='sidebar-rail'] { display: none !important; }
`;
    document.head.appendChild(style);
    return style;
  };

  const insideDialogContent = (target: EventTarget | null) => {
    if (!(target instanceof Node)) {
      return false;
    }

    const element = target instanceof Element ? target : target.parentElement;
    if (!(element instanceof Element)) {
      return false;
    }

    return Boolean(element.closest("[data-slot='dialog-content']"));
  };

  const lockSettingsDialog = () => {
    const settings = document.querySelector(".settings-dialog");
    if (!(settings instanceof HTMLElement)) {
      setSettingsReady(false);
      return false;
    }

    settings.style.height = "100%";
    settings.style.maxHeight = "100%";

    const content = settings.closest("[data-slot='dialog-content']");
    if (!(content instanceof HTMLElement)) {
      setSettingsReady(false);
      return false;
    }

    content.style.width = "100vw";
    content.style.height = "100vh";
    content.style.minHeight = "100vh";
    content.style.maxHeight = "100vh";
    content.style.borderRadius = "0";

    const body = content.querySelector("[data-slot='dialog-body']");
    if (body instanceof HTMLElement) {
      body.style.height = "100%";
      body.style.maxHeight = "100%";
    }

    const container = content.closest("[data-slot='dialog-container']");
    if (container instanceof HTMLElement) {
      container.style.width = "100vw";
      container.style.height = "100vh";
      container.style.maxWidth = "100vw";
      container.style.maxHeight = "100vh";
    }

    const close = content.querySelector("[data-slot='dialog-close-button']");
    if (close instanceof HTMLElement) {
      close.style.display = "none";
    }

    const dialog = settings.closest("[data-component='dialog']");
    if (!(dialog instanceof HTMLElement)) {
      setSettingsReady(false);
      return false;
    }

    dialog.style.alignItems = "stretch";
    dialog.style.justifyContent = "stretch";
    dialog.style.pointerEvents = "auto";

    const overlay = dialog.previousElementSibling;
    if (overlay instanceof HTMLElement && overlay.getAttribute("data-component") === "dialog-overlay") {
      overlay.style.pointerEvents = "none";
    }

    setSettingsReady(true);
    return true;
  };

  const showSettingsDialog = () => {
    if (!settingsMode) {
      return;
    }

    if (lockSettingsDialog()) {
      return;
    }

    if (opening) {
      return;
    }

    opening = true;
    openSettingsDialog();
    window.setTimeout(() => {
      opening = false;
      lockSettingsDialog();
    }, 120);
  };

  onCleanup(() => {
    dead = true;
  });

  onMount(() => {
    if (settingsMode) {
      setSettingsReady(false);
      const style = applySettingsModeStyle();
      setTimeout(() => {
        showSettingsDialog();
      }, 0);

      const observer = new MutationObserver(() => {
        showSettingsDialog();
      });

      const root = document.body;
      if (root) {
        observer.observe(root, {
          childList: true,
          subtree: true,
        });
      }

      const blockEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape") {
          return;
        }

        const settings = document.querySelector(".settings-dialog");
        if (!(settings instanceof HTMLElement)) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
      };

      const blockOutside = (event: Event) => {
        const settings = document.querySelector(".settings-dialog");
        if (!(settings instanceof HTMLElement)) {
          return;
        }

        if (insideDialogContent(event.target)) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
      };

      window.addEventListener("keydown", blockEscape, true);
      window.addEventListener("pointerdown", blockOutside, true);
      window.addEventListener("mousedown", blockOutside, true);
      window.addEventListener("click", blockOutside, true);
      onCleanup(() => {
        observer.disconnect();
        window.removeEventListener("keydown", blockEscape, true);
        window.removeEventListener("pointerdown", blockOutside, true);
        window.removeEventListener("mousedown", blockOutside, true);
        window.removeEventListener("click", blockOutside, true);
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      });
      return;
    }

    if (booted) return;
    booted = true;

    const directory = config.workspaceDirectory;
    if (!directory) return;

    void startupPath(directory).then((path) => {
      if (dead) return;
      setTimeout(() => navigate(path, { replace: true }), 0);
    });
  });

  const trigger = (action: HostAction) => {
    if (action === "newSession") {
      command.trigger("session.new", "palette");
      return;
    }

    if (action === "openSettings") {
      if (settingsMode) {
        showSettingsDialog();
        return;
      }

      void platform.openSettings?.();
      return;
    }

    if (action === "refresh") {
      window.location.reload();
    }
  };

  onMount(() => {
    const listener = (action: HostAction) => {
      trigger(action);
    };

    hostActionListeners.add(listener);
    while (pendingHostActions.length > 0) {
      const action = pendingHostActions.shift();
      if (!action) {
        continue;
      }
      listener(action);
    }
    onCleanup(() => hostActionListeners.delete(listener));
  });

  return null;
}

function HostThemeBridge() {
  const theme = useTheme();
  createEffect(() => {
    const scheme = hostScheme();
    if (theme.colorScheme() === scheme) return;
    theme.setColorScheme(scheme);
  });
  return null;
}

const server: ServerConnection.Http = {
  type: "http",
  displayName: (() => {
    try {
      return new URL(config.serverUrl).host;
    } catch {
      return config.serverUrl;
    }
  })(),
  http: {
    url: aliasServerUrl(config.serverUrl),
  },
};

render(
  () => (
    <PlatformProvider value={platform}>
      <AppBaseProviders>
          <AppInterface
            defaultServer={ServerConnection.Key.make(readDefaultServerKey() || aliasServerUrl(config.serverUrl))}
            servers={[server]}
            router={MemoryRouter}
            disableHealthCheck={Boolean(config.disableHealthCheck)}
          >
          <HostThemeBridge />
          <HostBridge />
        </AppInterface>
      </AppBaseProviders>
    </PlatformProvider>
  ),
  root,
);
