# OpenCode VS Code

OpenCode VS Code is a VS Code sidebar client for OpenCode.

Repository: `https://github.com/rodrigomart123/opencode-vscode`

## Overview

- Runs OpenCode inside a VS Code webview sidebar
- Uses the active VS Code workspace folder as the OpenCode working directory
- Connects to an existing OpenCode server, with optional local server management
- Supports starting new sessions, refreshing state, and opening settings from VS Code commands

## Auto-start behavior

Yes, OpenCode auto-start is enabled by default.

- Setting: `opencodeVisual.autoStartServer`
- Default value: `true`
- When the configured server is unreachable, the extension automatically starts `opencode serve`

If you disable it (`false`), the extension will only connect to an already running server.

## Requirements

- VS Code `1.96.0` or newer
- OpenCode CLI installed (`opencode` on PATH), or configure `opencodeVisual.opencodePath`
- Node.js `20+` and npm (only needed when building/packaging from source)

## Install as a normal VS Code extension

1. Build and package VSIX:

   ```bash
   npm install
   npm run build
   npx @vscode/vsce package
   ```

2. Install VSIX in VS Code:
   - Open Extensions view
   - Click `...` (top-right)
   - Select `Install from VSIX...`
   - Choose the generated `.vsix` file (for example `opencode-vscode-0.0.1.vsix`)

Optional CLI install:

```bash
code --install-extension .\opencode-vscode-0.0.1.vsix
```

Then reload VS Code and open the OpenCode icon in the Activity Bar.

## Development

- Open this folder in VS Code
- Press `F5` to launch Extension Development Host
- Open the OpenCode sidebar in the host window

## Commands

- `OpenCode: Focus Sidebar`
- `OpenCode: New Session`
- `OpenCode: Refresh`
- `OpenCode: Open Settings`
- `OpenCode: Restart Local Server`

## Settings

- `opencodeVisual.opencodePath`
- `opencodeVisual.serverBaseUrl`
- `opencodeVisual.autoStartServer`
- `opencodeVisual.debugServerLogs`
