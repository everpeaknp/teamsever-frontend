# macOS and Native Desktop Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship TeamsEver Electron for Intel and Apple Silicon Macs, detect foreground apps on supported macOS sessions, and deliver native updates through the app without requiring repeat manual downloads.

**Architecture:** Add a least-privilege macOS foreground-app adapter and platform capability registration, then package signed/notarized macOS installers. Use `electron-updater` with stable GitHub Releases metadata to download compatible native updates in the background and show an in-app ready-to-restart prompt; defer installation during an active shift. Keep web deployments independently live inside the Electron web view.

**Tech Stack:** Electron 44, electron-vite, electron-builder, Swift/macOS `NSWorkspace`, electron-updater, GitHub Actions, TypeScript/Vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-mobile-desktop-sync-macos-design.md`

## Global Constraints

- macOS builds target Intel (`x64`) and Apple Silicon (`arm64`); produce a universal artifact where practical.
- Foreground detection returns only a process/bundle identifier; never collect window titles, URLs, document names, screenshots, or raw input.
- macOS capability failures must not prevent supported clock-in/out behavior.
- Preserve Windows and Linux/X11 support; Linux Wayland remains explicitly unsupported for foreground-app identification.
- Sign and notarize Mac release artifacts with protected Apple Developer credentials; missing credentials fail only the macOS release job clearly.
- Stable updates download in the background and require an explicit restart to install; never interrupt an active shift.
- A hosted web deployment does not require a new desktop binary; a native Electron change does.
- Do not push any repository changes.

## Review Focus

- Mac identity lookup must work on both CPU architectures without elevated permissions: helper tests and macOS CI in Task 1.
- Missing or invalid Apple credentials must not block Windows/Linux artifacts: workflow test/validation in Task 3.
- Draft, prerelease, wrong-architecture, or malformed update metadata must not be installed: updater tests in Task 4.
- Update restart must be unavailable during an active time entry: updater state tests in Task 4.
- Existing Windows NSIS and Linux AppImage downloads must remain unchanged: packaging workflow checks in Task 3.

---

### Task 1: Add a macOS foreground-app identity adapter

**Files:**
- Create: `desktop/native/macos/ForegroundApp.swift`
- Create: `desktop/scripts/build-macos-helper.mjs`
- Modify: `desktop/src/main/foregroundProcess.ts`
- Modify: `desktop/src/main/tracker.ts`
- Modify: `desktop/src/main/tracker.test.ts`
- Test: `desktop/src/main/macosForeground.test.ts`

**Interfaces:**
- `getForegroundProcessName('darwin')` returns a normalized bundle identifier or `null`; it never returns a window title.
- `foregroundAppSupport('darwin')` reports runtime availability and a user-readable reason when unsupported.
- The packaged helper is invoked with `execFile` and returns one bounded identifier on stdout; no shell interpolation is permitted.

- [ ] **Step 1: Add failing adapter tests** for bundle identifier normalization, empty helper output, helper timeout/nonzero exit, and independent `darwin` platform support in `canMonitorForegroundApps`.
- [ ] **Step 2: Run `npm --prefix desktop test -- --run src/main/macosForeground.test.ts`**; confirm macOS is currently reported unsupported.
- [ ] **Step 3: Implement the Swift `NSWorkspace.frontmostApplication` helper** and build script. Return only `bundleIdentifier` (fall back to a sanitized process name when absent); do not query accessibility APIs or window metadata.
- [ ] **Step 4: Connect capability and process lookup** in `foregroundProcess.ts`/`tracker.ts`; fail closed to unavailable without preventing attendance clocking.
- [ ] **Step 5: Run `npm --prefix desktop test && npm --prefix desktop run typecheck`**; all tests/type checks must pass on the current host.

### Task 2: Register macOS as a trusted desktop platform

**Files:**
- Modify: backend `src/controllers/desktopAttendanceController.ts`
- Modify: backend `src/models/TrustedAttendanceDevice.ts`
- Modify: frontend `src/lib/desktopAttendance.ts`
- Modify: frontend `src/types/desktop.d.ts`
- Modify: frontend `desktop/src/main/index.ts` only where platform reporting requires it
- Test: backend `src/__tests__/desktopDeviceRoutes.test.ts`
- Test: frontend `src/lib/desktopAttendance.test.ts`

**Interfaces:**
- Device creation accepts `platform: 'macos'` and persists that exact platform; renderer provisioning maps Electron `process.platform === 'darwin'` to `macos`.
- Existing credential and revocation behavior remains identical across platforms.

- [ ] **Step 1: Add failing route/provision tests** proving Mac devices register, report platform `macos`, and reject unknown platforms.
- [ ] **Step 2: Run targeted backend and frontend tests**; confirm current code rejects `macos` and `darwin`.
- [ ] **Step 3: Update platform validation and renderer mapping** without changing credential format or existing Windows/Linux behavior.
- [ ] **Step 4: Run `npm test -- --runInBand src/__tests__/desktopDeviceRoutes.test.ts` in backend and `npm test -- --run src/lib/desktopAttendance.test.ts` in frontend**; all must pass.

### Task 3: Package, sign, notarize, and release macOS artifacts

**Files:**
- Modify: `desktop/electron-builder.yml`
- Modify: `desktop/package.json`
- Modify: `desktop/package-lock.json`
- Modify: `.github/workflows/desktop-release.yml`
- Create: `desktop/scripts/validate-mac-signing.mjs`
- Test: `desktop/scripts/validate-mac-signing.test.mjs`

**Interfaces:**
- Add `npm run dist:mac` to validate URLs/version, build the macOS helper, run electron-vite, and package a signed/notarized `.dmg` for x64 and arm64/universal.
- The GitHub Actions macOS matrix uses `macos-14`; signing inputs are `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` from protected secrets.
- Missing signing secrets fail the Mac release job before packaging, while Windows and Linux matrix jobs continue independently.

- [ ] **Step 1: Add failing script tests** for complete, missing, and partial signing configuration; test that a missing Mac secret set yields an actionable failure.
- [ ] **Step 2: Run `npm --prefix desktop test -- --run scripts/validate-mac-signing.test.mjs`**; confirm validation is missing.
- [ ] **Step 3: Configure macOS targets, helper resources, package scripts, and the macOS CI matrix** while preserving current Windows NSIS and Linux AppImage jobs.
- [ ] **Step 4: Run URL/version/signing validators, `npm --prefix desktop run typecheck`, and `npm --prefix desktop test`**; all must pass. Build Mac artifacts on the GitHub macOS runner, not by claiming a Linux cross-build proves native signing.
- [ ] **Step 5: Verify release outputs** include `.dmg`/architecture artifacts and the platform metadata required by the updater; do not publish a release during implementation.

### Task 4: Add safe background update download and restart prompt

**Files:**
- Modify: `desktop/package.json`
- Modify: `desktop/package-lock.json`
- Modify: `desktop/electron-builder.yml`
- Create: `desktop/src/main/desktopUpdater.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/preload/index.ts`
- Modify: `src/types/desktop.d.ts`
- Create: `src/components/analytics/DesktopUpdateToast.tsx`
- Modify: `src/components/layout/ClientLayout.tsx`
- Test: `desktop/src/main/desktopUpdater.test.ts`
- Test: `src/components/analytics/DesktopUpdateToast.test.tsx`

**Interfaces:**
- `initializeDesktopUpdater({ isPackaged, platform, hasActiveShift, notifyRenderer })` checks only stable published releases, downloads in background, and exposes `{ version, downloaded, canRestart }` state.
- `installDownloadedUpdate()` calls `quitAndInstall()` only after an explicit user restart action and only when no shift is active.
- Preload exposes a minimal subscribe/get-state/restart API; no update URL or shell access is exposed to the renderer.

- [ ] **Step 1: Write failing tests** for packaged-vs-dev behavior, stable-only update checks, event delivery, disabled restart during active shifts, explicit restart installation, and platform-specific metadata selection.
- [ ] **Step 2: Run `npm --prefix desktop test -- --run src/main/desktopUpdater.test.ts`**; confirm updater state handling is absent.
- [ ] **Step 3: Add `electron-updater` and configure the GitHub stable release provider** so CI artifacts include `latest.yml`, `latest-linux.yml`, and `latest-mac.yml` metadata where supported.
- [ ] **Step 4: Implement safe main-process updater state** and emit update-ready notifications to the trusted renderer. Defer installation while `getDeviceStatus` reports an active shift; resume the restart offer after clock-out.
- [ ] **Step 5: Implement the global in-app update toast** with version, “restart to update”, and dismiss actions; it must not show GitHub URLs or require manual downloads.
- [ ] **Step 6: Run updater and toast tests, then `npm --prefix desktop run typecheck && npm --prefix desktop test && npm --prefix desktop run build` and targeted frontend tests**; all must pass.

### Task 5: Publish update metadata from stable release CI

**Files:**
- Modify: `.github/workflows/desktop-release.yml`
- Modify: `desktop/scripts/validate-release-version.mjs`
- Test: `desktop/scripts/validate-release-version.test.mjs`

- [ ] **Step 1: Add a failing workflow/version test** asserting only tags already on `main` create stable update metadata and prerelease/draft tags are excluded from the updater feed.
- [ ] **Step 2: Run the targeted validator test**; confirm current draft-only release process cannot deliver stable updates.
- [ ] **Step 3: Update the release job** to upload all platform installers and updater metadata to a published stable GitHub Release only after every required build succeeds. Keep draft releases available only as an explicit review path.
- [ ] **Step 4: Verify workflow YAML, release tag checks, and artifact paths**; ensure Mac signing failures do not cancel completed Windows/Linux artifacts, but the release is not published unless required platform outputs pass.

### Task 6: Verify native updates on supported platforms

**Files:**
- Modify: `desktop/README.md`
- Create: `desktop/docs/manual-update-qa.md`

- [ ] **Step 1: Document the native update lifecycle and manual QA matrix**: install vN, publish vN+1, observe background download, verify toast, verify active shift defers restart, clock out, restart, confirm vN+1.
- [ ] **Step 2: Run Windows and Linux release smoke tests** for actual installers and update metadata; verify hosted web-only deployment still appears after Electron web reload without a native installer.
- [ ] **Step 3: Run Mac Intel/Apple Silicon launch, foreground detection, signing, notarization, update, and restart checks** on macOS runners/devices.
- [ ] **Step 4: Run `git diff --check` and review all three repositories' statuses**; keep work local and unpushed until explicitly requested.
