import * as vscode from "vscode";
import { OpenCodeService } from "./opencodeService";
import { OpenCodeSidebarProvider } from "./sidebarProvider";
import { OpenCodeSettingsPanel } from "./settingsPanel";

export async function activate(context: vscode.ExtensionContext) {
  const service = new OpenCodeService(context);
  const provider = new OpenCodeSidebarProvider(context, service);
  const settingsPanel = new OpenCodeSettingsPanel(context, service);

  const syncWorkspace = (reloadOnChange: boolean) => {
    void service
      .syncWorkspaceContext()
      .then(async (changed) => {
        if (!reloadOnChange || !changed) {
          return;
        }
        await provider.reload();
      })
      .catch(() => {
        // State errors are surfaced by the sidebar connection state.
      });
  };

  context.subscriptions.push(service, provider, settingsPanel);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(OpenCodeSidebarProvider.viewId, provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      syncWorkspace(false);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      syncWorkspace(true);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("opencodeVisual")) {
        return;
      }
      void provider.reload();
      void settingsPanel.reload();
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      syncWorkspace(false);
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      provider.notifyTheme();
      settingsPanel.notifyTheme();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("opencodeVisual.focus", async () => {
      await provider.reveal();
    }),
    vscode.commands.registerCommand("opencodeVisual.newSession", async () => {
      await provider.reveal();
      provider.dispatchAction("newSession");
    }),
    vscode.commands.registerCommand("opencodeVisual.refresh", async () => {
      await provider.reload();
      await provider.reveal();
    }),
    vscode.commands.registerCommand("opencodeVisual.openSettings", async () => {
      await settingsPanel.open();
    }),
    vscode.commands.registerCommand("opencodeVisual.restartServer", async () => {
      await service.ensureServerReady(true);
      await provider.reload();
      await settingsPanel.reload();
    }),
  );

  void service.ensureServerReady().catch(() => {
    // The webview will surface connection failures against the configured server.
  });
}

export function deactivate() {
  // VS Code disposes subscriptions registered during activation.
}
