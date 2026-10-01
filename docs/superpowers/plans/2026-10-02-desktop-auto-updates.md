# TeamsEver Desktop automatic updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let supported TeamsEver desktop installations download published Electron updates in the background and install them after a user-approved restart or a safe app exit.

**Architecture:** `electron-updater` runs only in Electron's main process and reads update manifests from the existing public GitHub Releases. The main process sends typed update state over the existing preload bridge; a desktop-only global UI presents progress, restart, later, and official direct-download fallback actions. Installation checks trusted desktop clock state before restarting.

**Tech Stack:** Electron 44, electron-builder 26, electron-updater, TypeScript, Vitest, Next.js, Sonner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-01-desktop-auto-updates-design.md`

## Global Constraints

- Use only the public `everpeaknp/teamsever-frontend` GitHub Releases as update source.
- Supported artifacts remain Windows NSIS x64 and Linux AppImage x64.
- Keep the app usable on update-check/download errors; never force a restart.
- Do not restart or install while trusted desktop status reports a running shift.
- Keep update IPC behind the existing context-isolated preload bridge; renderer may not supply arbitrary URLs.
- Do not push, create a tag, or publish a release as part of implementation.

## Review Focus

- A release without its update manifest must not be treated as available; add manifest/artifact validation in Task 1.
- A user clocked in during download must not be restarted; test install deferral and re-check after clock-out in Task 2.
- Browser sessions have no Electron bridge and must remain unaffected; test the desktop-only UI guard in Task 3.
- Platform fallback URLs must select only the official Windows installer or Linux AppImage; test allowlisted URLs in Task 3.
- Offline or malformed update responses must not block normal clocking; test updater errors are reported without disabling attendance in Task 2.

---

### Task 1: Publish electron-builder update feeds

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/package-lock.json`
- Modify: `desktop/electron-builder.yml`
- Modify: `.github/workflows/desktop-release.yml`
- Create: `desktop/scripts/validate-update-artifacts.mjs`
- Create: `desktop/src/main/updateArtifacts.test.ts`

**Interfaces:**
- Produces the release artifacts consumed by Task 2: `latest.yml` for Windows, `latest-linux.yml` for AppImage, installer/AppImage files, and any generated blockmaps.

- [x] **Step 1: Write failing artifact validation tests in `desktop/src/main/updateArtifacts.test.ts`.**
  - Assert Windows metadata names the `TeamsEver-Setup.exe` installer and Linux metadata names `TeamsEver.AppImage`.
  - Assert missing manifests or platform installers fail validation.
- [x] **Step 2: Run the validator tests and confirm they fail because the validator does not exist.**
- [x] **Step 3: Add GitHub publisher metadata and create an importable artifact validator.**
  - Configure `everpeaknp/teamsever-frontend` as the GitHub publisher.
  - Validate both per-platform release directories before uploading.
- [x] **Step 4: Update release workflow uploads to include the manifests and blockmaps with the installers.**
  - Keep existing tag ancestry verification and `gh release create` behavior.
- [x] **Step 5: Run artifact validator tests and `npm run validate:release-version` in `desktop`.**
- [x] **Step 6: Commit this task locally; do not push or tag.**

### Task 2: Add safe main-process update lifecycle

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/package-lock.json`
- Create: `desktop/src/main/desktopUpdater.ts`
- Create: `desktop/src/main/desktopUpdater.test.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/main/desktopPresenceSession.ts` only if a shared status check is needed

**Interfaces:**
- `DesktopUpdaterController` consumes an injected updater adapter, `getClockedIn(): Promise<boolean>`, and `publish(state: DesktopUpdateState): void`.
- `DesktopUpdateState` is a discriminated union for `checking`, `available`, `downloading` (percent), `downloaded` (version), `not-available`, `deferred` (version), and `error` (safe message).
- `DesktopUpdaterController.checkForUpdates(): Promise<void>` and `.installDownloadedUpdate(): Promise<boolean>` are called by main-process startup/timers and trusted IPC respectively.

- [x] **Step 1: Write failing tests for event-to-state mapping, update check failure, download progress, and downloaded update state.**
- [x] **Step 2: Write failing tests proving install is refused while clocked in and becomes allowed after the status check reports clock-out.**
- [x] **Step 3: Write a failing test proving update-service errors do not clear or alter attendance state.**
- [x] **Step 4: Run the updater tests and verify they fail for missing controller behavior.**
- [x] **Step 5: Implement the injected controller and connect `electron-updater` in `desktop/src/main/index.ts`.**
  - Check on startup and every six hours; download in the background.
  - Defer `quitAndInstall` until explicit restart or app exit, and gate either path on a fresh no-active-shift check.
  - Publish state over an allowlisted main-to-renderer event and expose check/install operations over trusted IPC.
- [x] **Step 6: Run updater unit tests, desktop typecheck, and desktop test suite.**
- [x] **Step 7: Commit this task locally; do not push or tag.**

### Task 3: Show global desktop update status and actions

**Files:**
- Modify: `desktop/src/preload/index.ts`
- Modify: `src/types/desktop.d.ts`
- Create: `src/components/layout/DesktopUpdateNotifier.tsx`
- Modify: `src/components/layout/ClientLayout.tsx`
- Modify: `desktop/src/main/index.ts` for fixed official-release fallback URL selection if not completed in Task 2
- Test: `src/components/layout/DesktopUpdateNotifier.test.tsx`

**Interfaces:**
- Preload exposes `onUpdateState(callback): unsubscribe`, `installUpdate(): Promise<boolean>`, `checkForUpdates(): Promise<void>`, and `openLatestDownload(): Promise<void>`.
- `DesktopUpdateNotifier` subscribes only when `window.teamseverDesktop` exists, displays state using Sonner, and invokes the typed bridge methods.

- [x] **Step 1: Write failing component tests for browser no-op, download progress, ready-to-restart action, clocked-in deferral message, and manual fallback.**
- [x] **Step 2: Run component tests and confirm missing desktop update notification behavior.**
- [x] **Step 3: Implement typed preload subscriptions and the global desktop-only notifier.**
  - Toast offers **Restart to update** and **Later**.
  - If clocked in, explain clock-out is required before restart.
  - On update failure, offer a direct official platform asset download without exposing GitHub navigation or accepting renderer-provided URLs.
- [x] **Step 4: Run component tests and relevant frontend typecheck.**
- [x] **Step 5: Commit this task locally; do not push or tag.**

### Task 4: Verify packaged outputs and end-to-end release configuration

**Files:**
- Modify: `desktop/src/main/updateArtifacts.test.ts` if needed
- Modify: `desktop/README.md` with update behavior and supported installer formats
- Verify: `.github/workflows/desktop-release.yml`

- [x] **Step 1: Run available packaging commands.** Linux AppImage built and verified; this WSL host cannot run the Windows installer toolchain, which remains covered by the Windows Actions job.
- [x] **Step 2: Validate emitted Linux metadata against the generated AppImage; Windows manifest/artifact requirements are covered by unit tests and the Windows Actions validator.**
- [x] **Step 3: Run `npm run typecheck && npm test` in `desktop`.**
- [x] **Step 4: Run the frontend production build and relevant component tests.**
- [x] **Step 5: Review the complete diff and confirm no release, tag, or push occurred.**
- [ ] **Step 6: Commit any documentation or verification fixes locally; do not push or tag.**
