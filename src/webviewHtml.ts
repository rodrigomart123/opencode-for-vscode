import * as vscode from "vscode";

function createNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

const themePreload = `;(function () {
  function setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {}
  }

  function getItem(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  function removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {}
  }

  function ensureObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value
    }
    return {}
  }

  function readJson(key, fallback) {
    try {
      var raw = getItem(key)
      if (!raw) return fallback
      var parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed
      }
      return fallback
    } catch {
      return fallback
    }
  }

  function writeJson(key, value) {
    try {
      setItem(key, JSON.stringify(value))
    } catch {}
  }

  function base64UrlEncode(value) {
    try {
      var bytes = new TextEncoder().encode(value)
      var binary = ""
      for (var index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index])
      }
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
    } catch {
      return ""
    }
  }

  var cfg = window.__OPENCODE_VSCODE_CONFIG__ || {}
  var nativeSettings = cfg.nativeSettings && typeof cfg.nativeSettings === "object" ? cfg.nativeSettings : null
  var hasNativeScheme = false

  if (nativeSettings) {
    if (typeof nativeSettings.themeId === "string" && nativeSettings.themeId) {
      setItem("opencode-theme-id", nativeSettings.themeId)
    }

    if (
      nativeSettings.uiColorScheme === "system" ||
      nativeSettings.uiColorScheme === "light" ||
      nativeSettings.uiColorScheme === "dark"
    ) {
      setItem("opencode-color-scheme", nativeSettings.uiColorScheme)
      hasNativeScheme = true
    }

    if (nativeSettings.language === "auto") {
      removeItem("opencode.global.dat:language")
    } else if (typeof nativeSettings.language === "string" && nativeSettings.language) {
      writeJson("opencode.global.dat:language", { locale: nativeSettings.language })
    }

    var settings = ensureObject(readJson("settings.v3", {}))
    settings.general = ensureObject(settings.general)
    settings.updates = ensureObject(settings.updates)
    settings.appearance = ensureObject(settings.appearance)
    settings.notifications = ensureObject(settings.notifications)
    settings.sounds = ensureObject(settings.sounds)

    settings.general.showReasoningSummaries = !!nativeSettings.showReasoningSummaries
    settings.general.shellToolPartsExpanded = !!nativeSettings.shellToolPartsExpanded
    settings.general.editToolPartsExpanded = !!nativeSettings.editToolPartsExpanded
    settings.general.autoSave = nativeSettings.autoSave !== false
    settings.general.releaseNotes = nativeSettings.releaseNotes !== false
    settings.updates.startup = nativeSettings.checkUpdatesOnStartup !== false
    settings.appearance.sans = typeof nativeSettings.uiFont === "string" ? nativeSettings.uiFont : ""
    settings.appearance.mono = typeof nativeSettings.codeFont === "string" ? nativeSettings.codeFont : ""
    settings.appearance.fontSize =
      typeof nativeSettings.fontSize === "number" && Number.isFinite(nativeSettings.fontSize)
        ? Math.max(10, Math.min(28, nativeSettings.fontSize))
        : 14

    settings.notifications.agent = nativeSettings.notifyAgent !== false
    settings.notifications.permissions = nativeSettings.notifyPermissions !== false
    settings.notifications.errors = !!nativeSettings.notifyErrors

    settings.sounds.agentEnabled = nativeSettings.soundAgentEnabled !== false
    settings.sounds.agent =
      typeof nativeSettings.soundAgent === "string" && nativeSettings.soundAgent
        ? nativeSettings.soundAgent
        : "staplebops-01"
    settings.sounds.permissionsEnabled = nativeSettings.soundPermissionsEnabled !== false
    settings.sounds.permissions =
      typeof nativeSettings.soundPermissions === "string" && nativeSettings.soundPermissions
        ? nativeSettings.soundPermissions
        : "staplebops-02"
    settings.sounds.errorsEnabled = nativeSettings.soundErrorsEnabled !== false
    settings.sounds.errors =
      typeof nativeSettings.soundErrors === "string" && nativeSettings.soundErrors
        ? nativeSettings.soundErrors
        : "nope-03"

    if (
      nativeSettings.customKeybinds &&
      typeof nativeSettings.customKeybinds === "object" &&
      !Array.isArray(nativeSettings.customKeybinds)
    ) {
      var keybinds = {}
      for (var keybindId in nativeSettings.customKeybinds) {
        if (!Object.prototype.hasOwnProperty.call(nativeSettings.customKeybinds, keybindId)) continue
        var keybindValue = nativeSettings.customKeybinds[keybindId]
        if (typeof keybindValue !== "string") continue
        keybinds[keybindId] = keybindValue
      }
      settings.keybinds = keybinds
    }

    writeJson("settings.v3", settings)

    if (
      nativeSettings.modelVisibility &&
      typeof nativeSettings.modelVisibility === "object" &&
      !Array.isArray(nativeSettings.modelVisibility)
    ) {
      var modelStore = ensureObject(readJson("opencode.global.dat:model", {}))
      var recent = Array.isArray(modelStore.recent) ? modelStore.recent : []
      var variant = ensureObject(modelStore.variant)
      var user = []
      for (var modelKey in nativeSettings.modelVisibility) {
        if (!Object.prototype.hasOwnProperty.call(nativeSettings.modelVisibility, modelKey)) continue
        var visibility = nativeSettings.modelVisibility[modelKey]
        if (visibility !== "show" && visibility !== "hide") continue
        var slash = modelKey.indexOf("/")
        if (slash <= 0 || slash >= modelKey.length - 1) continue
        user.push({
          providerID: modelKey.slice(0, slash),
          modelID: modelKey.slice(slash + 1),
          visibility: visibility,
        })
      }
      modelStore.user = user
      modelStore.recent = recent
      modelStore.variant = variant
      writeJson("opencode.global.dat:model", modelStore)
    }

    if (
      typeof nativeSettings.autoAcceptWorkspacePermissions === "boolean" &&
      typeof cfg.workspaceDirectory === "string" &&
      cfg.workspaceDirectory
    ) {
      var permissionStore = ensureObject(readJson("opencode.global.dat:permission", {}))
      permissionStore.autoAccept = ensureObject(permissionStore.autoAccept)
      var key = base64UrlEncode(cfg.workspaceDirectory) + "/*"
      if (key) {
        permissionStore.autoAccept[key] = nativeSettings.autoAcceptWorkspacePermissions
        writeJson("opencode.global.dat:permission", permissionStore)
      }
    }
  }

  var key = "opencode-theme-id"
  var themeId = getItem(key) || "oc-2"

  var hostScheme = cfg && (cfg.colorScheme === "dark" || cfg.colorScheme === "light") ? cfg.colorScheme : null
  if (hostScheme && !hasNativeScheme) {
    setItem("opencode-color-scheme", hostScheme)
  }

  if (themeId === "oc-1") {
    themeId = "oc-2"
    setItem(key, themeId)
    removeItem("opencode-theme-css-light")
    removeItem("opencode-theme-css-dark")
  }

  var scheme = getItem("opencode-color-scheme") || hostScheme || "system"
  var isDark = scheme === "dark" || (scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  var mode = isDark ? "dark" : "light"

  document.documentElement.dataset.theme = themeId
  document.documentElement.dataset.colorScheme = mode

  if (themeId === "oc-2") return

  var css = getItem("opencode-theme-css-" + mode)
  if (css) {
    var style = document.createElement("style")
    style.id = "oc-theme-preload"
    style.textContent =
      ":root{color-scheme:" +
      mode +
      ";--text-mix-blend-mode:" +
      (isDark ? "plus-lighter" : "multiply") +
      ";" +
      css +
      "}"
    document.head.appendChild(style)
  }
})()`;

const storagePreload = `;(function () {
  function allow(key) {
    return key === "settings.v3" || key.indexOf("opencode.global.dat:") === 0 || key.indexOf("opencode.settings.dat:") === 0 || key.indexOf("opencode-theme-") === 0
  }

  function emit(key, value) {
    try {
      window.dispatchEvent(new StorageEvent("storage", {
        key: key,
        oldValue: null,
        newValue: value,
        storageArea: localStorage,
        url: location.href,
      }))
    } catch {
      try {
        var event = document.createEvent("StorageEvent")
        event.initStorageEvent("storage", false, false, key, null, value, location.href, localStorage)
        window.dispatchEvent(event)
      } catch {}
    }
  }

  function sync(key, value) {
    var send = window.__OPENCODE_VSCODE_SYNC_STORAGE__
    if (typeof send === "function") {
      send(key, value)
    }
  }

  var cfg = window.__OPENCODE_VSCODE_CONFIG__ || {}
  var shared = cfg.sharedStorage && typeof cfg.sharedStorage === "object" ? cfg.sharedStorage : null

  if (shared) {
    for (var key in shared) {
      if (!Object.prototype.hasOwnProperty.call(shared, key)) continue
      if (!allow(key)) continue
      var value = shared[key]
      if (typeof value !== "string") continue
      try {
        localStorage.setItem(key, value)
      } catch {}
    }
  }

  var proto = Storage.prototype
  var setItem = proto.setItem
  var removeItem = proto.removeItem
  var muted = false

  proto.setItem = function (key, value) {
    if (this !== localStorage) {
      return setItem.call(this, key, value)
    }

    var next = String(value)
    var out = setItem.call(localStorage, key, next)
    if (!muted && allow(key)) {
      sync(key, next)
    }
    emit(key, next)
    return out
  }

  proto.removeItem = function (key) {
    if (this !== localStorage) {
      return removeItem.call(this, key)
    }

    var out = removeItem.call(localStorage, key)
    if (!muted && allow(key)) {
      sync(key, null)
    }
    emit(key, null)
    return out
  }

  window.addEventListener("message", function (event) {
    var message = event.data
    if (!message || message.type !== "storageSync" || !allow(message.key)) return

    muted = true
    try {
      if (message.value === null) {
        removeItem.call(localStorage, message.key)
      } else {
        setItem.call(localStorage, message.key, message.value)
      }
    } catch {}
    muted = false
    emit(message.key, message.value)
  })
})()`;

export function getWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  config: {
    serverUrl: string;
    version: string;
    workspaceDirectory: string | null;
    colorScheme: "light" | "dark";
    disableHealthCheck: boolean;
    settingsMode?: boolean;
    sharedStorage?: Record<string, string>;
    nativeSettings?: Record<string, unknown>;
  },
) {
  const nonce = createNonce();
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "app", "app.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "media", "app", "app.css"));
  const settingsBootStyle = config.settingsMode
    ? `<style nonce="${nonce}">
    #root[data-settings-ready="false"] {
      opacity: 0;
    }

    #root[data-settings-ready="true"] {
      opacity: 1;
    }

    [data-tauri-drag-region],
    [data-component="sidebar-nav-desktop"],
    [data-component="sidebar-nav-mobile"],
    [data-component="sidebar-rail"] {
      display: none !important;
    }

    [data-component="dialog-overlay"] {
      display: none !important;
      pointer-events: none !important;
    }

    [data-component="dialog"][data-transition] [data-slot="dialog-content"] {
      animation: none !important;
      transition: none !important;
    }
  </style>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" style="background-color: var(--background-base)">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} https: data: blob:; font-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; connect-src ${webview.cspSource} http: https: ws: wss:; worker-src ${webview.cspSource} blob:;"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    ${settingsBootStyle}
    <script nonce="${nonce}">window.__OPENCODE_VSCODE_CONFIG__ = ${JSON.stringify(config)};</script>
    <script nonce="${nonce}">${storagePreload}</script>
    <script nonce="${nonce}">${themePreload}</script>
    <title>OpenCode</title>
  </head>
  <body class="antialiased overscroll-none text-12-regular overflow-hidden">
    <div id="root" class="flex flex-col h-dvh p-px"></div>
    <script type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}
