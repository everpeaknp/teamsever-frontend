# TeamsEver Desktop (Electron)

**Status:** Implemented locally; native Windows and Ubuntu/X11 smoke tests remain
**Date:** 2026-09-30

## Scope

The Electron companion uses the existing TeamsEver account and attendance APIs. A signed-in user authorizes their own installation. Desktop clock entries identify their source and trusted device, while the server continues to enforce workspace membership, permissions, geofences, and clock state.

Foreground-app presence is an optional user consent. While enabled, the desktop reports the foreground process name once per minute only for a running shift started by that same desktop device. It does not inspect or send window titles, browser URLs, screenshots, keystrokes, clipboard contents, or document contents. This is app-presence metadata, not input activity or an AFK score, and it is not tamper-proof proof of work.

## Security and behavior

- Electron keeps `contextIsolation`, sandboxing, and `nodeIntegration: false`; its preload exposes a small IPC API and validates trusted-origin requests.
- The backend returns a random device credential once and stores only its SHA-256 hash. Electron stores the credential using OS encryption. Users can inspect and revoke their installations.
- Desktop clock-in and clock-out go through the same server attendance and location validation as web. A desktop-started shift requires clock-out from the same trusted installation. Web clocking remains available for web-started shifts.
- Attendance reports include clock-in and clock-out source labels. The desktop activity report shows app identifiers and unavailable gaps. Missing presence does not change clock times.
- Windows uses the foreground window's owning process name. Linux app detection currently requires X11 and `xdotool`; Wayland does not expose foreground app identity, so the app reports monitoring unavailable there while clocking continues.
- Installer builds validate configured HTTPS web and API origins. The navbar download control enables only when actual release assets exist.

## Validation boundary and later work

Backend targeted tests and build, frontend tests and production build, and Electron tests, typecheck, and build pass locally. The broader backend suite still has existing failures in `workspaceAnalytics.test.ts` and `notificationCenterController.test.ts`. The Windows process-name query was smoke-tested from Windows PowerShell, but the full app has not been tested against a deployed backend on native Windows or Ubuntu/X11. No release was published. Installer signing, auto-updates, macOS, mobile support, AFK scoring, and any form of content or input capture remain out of scope.
