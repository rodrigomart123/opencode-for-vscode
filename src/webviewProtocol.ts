export type HostAction = "newSession" | "refresh" | "openSettings";

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
    };
