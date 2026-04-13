# OpenCode Client for VS Code

OpenCode Client for VS Code is a VS Code sidebar extension for OpenCode sessions.

It embeds the OpenCode app in a VS Code webview and keeps session behavior tied to the currently open workspace folder.

## What it does

- Locks OpenCode to the active VS Code workspace folder.
- Restores the latest session for the current folder when the sidebar opens.
- Syncs light and dark theme from VS Code into the webview.
- Shows provider icons in provider settings and model selection.
- Connects to an existing OpenCode server or starts a local one when auto start is enabled.

## Requirements

- VS Code `1.96.0` or newer.
- Node.js `20+` and npm.
- OpenCode CLI installed, either on PATH or set via `opencodeVisual.opencodePath`.
- Optional for rebuilding the embedded webview app: clone `https://github.com/anomalyco/opencode` into `opencode-original/`.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. (Optional) Rebuild webview bundle from upstream OpenCode sources:

   ```bash
   git clone https://github.com/anomalyco/opencode opencode-original
   npm run build:webview
   ```

3. Build the extension bundle:

   ```bash
   npm run build:extension
   ```

4. Start the extension in development mode:

   - Open this folder in VS Code.
   - Press `F5` (or run `Run OpenCode Visual` from the debug dropdown).

5. In the Extension Development Host window, open the OpenCode icon in the Activity Bar.

## How to use

1. Open a workspace folder in VS Code.
2. Open the OpenCode sidebar.
3. Create a new session from the `+` button in the view title, or run `OpenCode: New Session`.
4. Send prompts in the sidebar input.
5. Open model and provider settings from the UI when needed.

## Commands

- `OpenCode: Focus Sidebar`
- `OpenCode: New Session`
- `OpenCode: Refresh`
- `OpenCode: Open Settings`
- `OpenCode: Restart Local Server`

## Extension settings

- `opencodeVisual.opencodePath`
- `opencodeVisual.serverBaseUrl`
- `opencodeVisual.autoStartServer`
- `opencodeVisual.debugServerLogs`

## Release and safety notes

- Build succeeds with `npm run build:webview` and `npm run build:extension`.
- `npm run check` currently reports one upstream type error in `opencode-original/packages/app/src/testing/prompt.ts` for `./terminal`.
- No hardcoded real secrets were found in local extension source paths (`src/`, `webview/`, `docs/`).
- Upstream test fixtures under `opencode-original/packages/opencode/test` contain fake example tokens such as `test-openai-key`.
