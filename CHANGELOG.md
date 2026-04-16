# Changelog

All notable changes to this project will be documented in this file.

## 0.1.5 - 2026-04-16

- Added host-bridged `openDiff` action wiring from webview tool rows (`edit`, `write`, `apply_patch`) so diff requests can route to VS Code.
- Updated bundled webview assets with tool-row narrow-width responsiveness and settings dialog layout fixes.

## 0.1.4 - 2026-04-15

- Fixed webview startup compatibility for servers that do not expose `/global/health`, preventing false "Could not reach ..." lock screens.
- Added local loopback fetch fallback routing (`127.0.0.1`, `localhost`, `[::1]`) to improve reliability across local bind variations.

## 0.1.3 - 2026-04-15

- Hardened OpenCode CLI discovery across platforms (PATH expansion, well-known install locations, and login-shell lookup) to reduce first-load failures when VS Code PATH differs from terminal.
- Improved fetch/network diagnostics and user-facing recovery hints when OpenCode server or CLI is unreachable.
- Improved session streaming resilience with reconnect behavior and busy-state fallback polling to avoid stuck/missing sidebar updates.
- Fixed `opencode.localhost` remapping to follow the resolved server host/protocol/port.

## 0.1.1 - 2026-04-14

- Corrected Marketplace identity metadata to publish under `rodrigomart123.opencode-for-vscode`.
- Updated extension/package naming and install instructions to use `opencode-for-vscode` consistently.

## 0.1.0 - 2026-04-14

- Stabilized workspace sync and reload behavior so switching files in the same workspace no longer resets the sidebar UI.
- Added safeguards to avoid transient startup races that could surface `worktree` undefined crashes.
- Hardened release metadata for Marketplace publishing (license, publisher metadata, notices, documentation).

## 0.0.1 - 2026-04-14

- Initial public release of OpenCode VS Code sidebar integration.
