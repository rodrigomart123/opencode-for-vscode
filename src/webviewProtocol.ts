export type HostAction = "newSession" | "refresh" | "openSettings";

export type ExtensionSettingKey = "opencodePath" | "serverBaseUrl" | "autoStartServer" | "debugServerLogs";

export type ExtensionSettings = {
  opencodePath: string;
  serverBaseUrl: string;
  autoStartServer: boolean;
  debugServerLogs: boolean;
};

export type HostToWebviewMessage = {
  type: "hostAction";
  action: HostAction;
} | {
  type: "hostTheme";
  colorScheme: "light" | "dark";
} | {
  type: "pickDirectoryResult";
  requestId: string;
  value: string | string[] | null;
} | {
  type: "fetchResponse";
  requestId: string;
  url: string;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
} | {
  type: "fetchChunk";
  requestId: string;
  chunk: string;
} | {
  type: "fetchEnd";
  requestId: string;
} | {
  type: "fetchError";
  requestId: string;
  message: string;
  name?: string;
} | {
  type: "extensionSettingsResult";
  requestId: string;
  value: ExtensionSettings | null;
  error?: string;
} | {
  type: "extensionSettingResult";
  requestId: string;
  value: ExtensionSettings | null;
  error?: string;
} | {
  type: "restartServerResult";
  requestId: string;
  error?: string;
};

export type WebviewToHostMessage =
  | {
      type: "webviewReady";
    }
  | {
      type: "openLink";
      url: string;
    }
  | {
      type: "openSettings";
    }
  | {
      type: "openDiff";
      filePath: string;
      before: string;
      after: string;
    }
  | {
      type: "pickDirectory";
      requestId: string;
      title?: string;
      multiple: boolean;
    }
  | {
      type: "fetchRequest";
      requestId: string;
      url: string;
      method: string;
      headers: Array<[string, string]>;
      body?: string;
    }
  | {
      type: "fetchAbort";
      requestId: string;
    }
  | {
      type: "getExtensionSettings";
      requestId: string;
    }
  | {
      type: "setExtensionSetting";
      requestId: string;
      key: ExtensionSettingKey;
      value: string | boolean;
    }
  | {
      type: "restartServer";
      requestId: string;
    };
