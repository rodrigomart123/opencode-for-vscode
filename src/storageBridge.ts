import type { HostToWebviewMessage, WebviewToHostMessage } from "./webviewProtocol";

const shared = [
  "settings.v3",
  "opencode.global.dat:",
  "opencode.settings.dat:",
  "opencode-theme-",
] as const;

function sharedKey(key: string) {
  return shared.some((item) => (item.endsWith(":") ? key.startsWith(item) : key.startsWith(item)));
}

type Sink = (message: HostToWebviewMessage) => void;

export class WebviewStorageBridge {
  private readonly data = new Map<string, string>();
  private readonly sinks = new Map<string, Sink>();

  register(id: string, sink: Sink) {
    this.sinks.set(id, sink);
    return () => this.sinks.delete(id);
  }

  snapshot() {
    return Object.fromEntries(this.data);
  }

  ready(id: string) {
    const sink = this.sinks.get(id);
    if (!sink) return;

    for (const [key, value] of this.data) {
      sink({ type: "storageSync", key, value });
    }
  }

  apply(id: string, message: Extract<WebviewToHostMessage, { type: "storageSet" | "storageRemove" }>) {
    if (!sharedKey(message.key)) return;

    if (message.type === "storageSet") {
      if (this.data.get(message.key) === message.value) return;
      this.data.set(message.key, message.value);
      this.broadcast(id, { type: "storageSync", key: message.key, value: message.value });
      return;
    }

    if (!this.data.has(message.key)) return;
    this.data.delete(message.key);
    this.broadcast(id, { type: "storageSync", key: message.key, value: null });
  }

  private broadcast(id: string, message: HostToWebviewMessage) {
    for (const [key, sink] of this.sinks) {
      if (key === id) continue;
      sink(message);
    }
  }
}

export const storageBridge = new WebviewStorageBridge();
