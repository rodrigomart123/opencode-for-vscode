import * as vscode from "vscode";
import { OpenCodeService } from "./opencodeService";
import { OpenCodeSidebarProvider } from "./sidebarProvider";

export async function activate(context: vscode.ExtensionContext) {
  const service = new OpenCodeService(context);
  const provider = new OpenCodeSidebarProvider(context, service);

  context.subscriptions.push(service, provider);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(OpenCodeSidebarProvider.viewId, provider, {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      void service.syncWorkspaceContext();
      void provider.reload();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void service.syncWorkspaceContext();
      void provider.reload();
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      void service.syncWorkspaceContext();
    }),
    vscode.window.onDidChangeActiveColorTheme(() => {
      provider.notifyTheme();
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
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:local.opencode-vscode opencodeVisual",
      );
    }),
    vscode.commands.registerCommand("opencodeVisual.restartServer", async () => {
      await service.ensureServerReady(true);
      await provider.reload();
      await provider.reveal();
    }),
  );

  void service.ensureServerReady().catch(() => {
    // The webview will surface connection failures against the configured server.
  });
}

export function deactivate() {
  // VS Code disposes subscriptions registered during activation.
}
