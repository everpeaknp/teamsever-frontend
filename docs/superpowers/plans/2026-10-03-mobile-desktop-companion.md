# Mobile-to-Desktop Companion Presence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Link an authenticated Electron desktop to a Flutter-origin active attendance entry so that desktop presence can be reported without creating or changing attendance entries.

**Architecture:** The backend labels Flutter clock events as `mobile`, stores a short-lived IP fingerprint for discovery, and owns an atomic companion-device link on the active time entry. Electron discovers eligible entries with its trusted device credential, asks the user to sync, then reports presence only after link acceptance; Flutter provides a short-lived pairing-code fallback. Existing activity consent, device credentials, clock duration, and source attribution remain authoritative.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, Jest; Flutter/Dart, Dio, BLoC, Flutter widget tests; Electron, React/Next.js, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-03-mobile-desktop-sync-macos-design.md`

## Global Constraints

- Mobile-started time entries keep `clockInSource: mobile` after companion pairing.
- A companion link never creates a second time entry or allows Electron to clock out a mobile-started shift.
- The first pairing offers **Sync this time**, **Always sync future mobile shifts**, and **Not now**; always-sync is per trusted desktop and only auto-links future same-IP candidates.
- Public IP match is discovery only; accept requires an authenticated explicit user action.
- Never treat client-supplied forwarding headers as authoritative; derive IP through the configured trusted proxy chain.
- Store no raw public IP in attendance or presence records; candidate fingerprints and pairing challenges expire.
- Presence is reported only when the trusted device's existing `activityMonitoringEnabled` setting is true.
- A presence outage never changes clock times or duration.
- Preserve all existing uncommitted work in `D:\Windows_Projects\TeamsEver`; do not reset, stash, or overwrite it.
- Do not push any repository changes.

## Review Focus

- Forged forwarded-IP headers must not create a discovery candidate: backend proxy/IP test in Task 2.
- Simultaneous desktop accepts must not attach two devices: atomic-link race test in Task 2.
- Challenge expiry, replay, and cross-user use must fail: challenge tests in Task 2.
- Clock-out or device revocation must immediately stop presence writes: backend authorization tests in Task 3 and client stop tests in Task 5.
- Existing desktop-origin clocking must remain unchanged: desktop regression tests in Tasks 1 and 3.

---

### Task 1: Give Flutter clock events an explicit mobile source

**Files:**
- Modify: backend `src/models/TimeEntry.ts`
- Modify: backend `src/services/attendanceService.ts`
- Modify: backend `src/controllers/attendanceController.ts`
- Modify: backend `src/routes/workspaceRoutes.ts`
- Test: backend `src/__tests__/mobileClockSource.test.ts`
- Test: backend `src/__tests__/desktopClockAuthorization.test.ts`

**Interfaces:**
- Consumes: existing authenticated workspace clock service and the Flutter request to `POST /api/workspaces/:id/clock/mobile-toggle`.
- Produces: `POST /api/workspaces/:id/clock/mobile-toggle`, authenticated with the normal user token, accepting `{ status: 'active' | 'inactive', locationFix?: LocationFix }`; creates entries with source `mobile` and closes the user's active entry without changing its original source.

- [ ] **Step 1: Write failing tests** proving that the mobile route records `clockInSource: mobile`, checks an enabled location policy, rejects malformed fixes, and does not allow unauthenticated requests.
- [ ] **Step 2: Run the targeted Jest test** with `npm test -- --runInBand src/__tests__/mobileClockSource.test.ts`; confirm it fails because the route/source handling is missing.
- [ ] **Step 3: Implement the mobile clock route and explicit source propagation** in `workspaceRoutes.ts`, `attendanceController.ts`, `attendanceService.ts`, and the `TimeEntry` source enum. Keep `/clock/toggle` behavior as web and `/clock/desktop-toggle` behavior as desktop.
- [ ] **Step 4: Run mobile and desktop clock authorization tests** with `npm test -- --runInBand src/__tests__/mobileClockSource.test.ts src/__tests__/desktopClockAuthorization.test.ts`; both must pass.

### Task 2: Add secure mobile-shift discovery and one-time pairing

**Files:**
- Create: backend `src/models/MobileDesktopCompanionCandidate.ts`
- Create: backend `src/models/DesktopPairingChallenge.ts`
- Create: backend `src/services/desktopCompanionService.ts`
- Modify: backend `src/controllers/desktopAttendanceController.ts`
- Modify: backend `src/models/TrustedAttendanceDevice.ts`
- Modify: backend `src/routes/attendanceLocationRoutes.ts`
- Modify: backend `src/controllers/attendanceController.ts`
- Test: backend `src/__tests__/desktopCompanionDiscovery.test.ts`
- Test: backend `src/__tests__/desktopCompanionPairing.test.ts`

**Interfaces:**
- `getCompanionCandidate(userId, deviceId, requestIp): Promise<CompanionCandidate | null>` returns only that user's running mobile-origin entry when the registered trusted device and keyed request-IP fingerprint match.
- `createPairingChallenge(userId, workspaceId): Promise<{ code: string; expiresAt: string }>` creates a short-lived challenge for the user's active mobile shift; persist only a hash.
- `acceptCompanionLink({ userId, deviceId, entryId?, challengeCode?, requestIpFingerprint?, alwaysSync? }): Promise<CompanionLink>` atomically attaches one trusted device after rechecking ownership, active status, workspace membership, source, IP eligibility or valid challenge, and conflict state. Exactly one of `entryId` with a matching IP fingerprint or `challengeCode` is required. `alwaysSync` may be enabled only by the user's explicit first-pairing choice.
- `setDesktopAutoSync(userId, deviceId, enabled): Promise<void>` changes the per-device always-sync preference.
- Desktop device routes: `GET /api/attendance/desktop/companion-candidate`, `POST /api/attendance/desktop/companion-link`.
- User routes: `POST /api/attendance/workspace/:workspaceId/desktop-companion-challenge`; desktop claims that code through the companion-link endpoint.

- [ ] **Step 1: Write failing tests** for same-user/same-IP discovery, different-IP nondiscovery, untrusted proxy headers, wrong-user and unpaired-device rejection, single-use/expiry of a pairing code, concurrent acceptance by two devices, and always-sync preference enable/disable plus automatic later linking.
- [ ] **Step 2: Run the targeted tests** with `npm test -- --runInBand src/__tests__/desktopCompanionDiscovery.test.ts src/__tests__/desktopCompanionPairing.test.ts`; confirm the candidate model/service/routes do not exist.
- [ ] **Step 3: Implement the candidate and challenge models** with TTL indexes, keyed IP fingerprints, hashed one-use challenge values, and only the minimal IDs needed for discovery. Remove candidate/challenge records on clock-out or expiry.
- [ ] **Step 4: Implement service and route handlers** using `req.ip` after the existing trusted-proxy configuration; never trust raw client IP headers. Use a conditional atomic update so only one active trusted device can link to a time entry. Persist always-sync only after explicit selection, auto-link only future same-IP candidates, and make the preference reversible.
- [ ] **Step 5: Run companion tests plus desktop-device route tests** with `npm test -- --runInBand src/__tests__/desktopCompanionDiscovery.test.ts src/__tests__/desktopCompanionPairing.test.ts src/__tests__/desktopDeviceRoutes.test.ts`; all must pass.

### Task 3: Permit linked companion devices to report presence

**Files:**
- Modify: backend `src/models/TimeEntry.ts`
- Modify: backend `src/controllers/desktopAttendanceController.ts`
- Modify: backend `src/services/desktopPresenceAuthorization.ts`
- Modify: backend `src/services/desktopClockAuthorization.ts` only if shared ownership checks require it
- Test: backend `src/__tests__/desktopPresenceAuthorization.test.ts`
- Test: backend `src/__tests__/desktopCompanionPresence.test.ts`

**Interfaces:**
- `TimeEntry` gains nullable companion-device and linked-at fields; the existing `clockInSource` and `clockInDevice` fields remain the attendance source of truth.
- `canRecordDesktopPresence` accepts either an active desktop-origin entry owned by the reporting device or an active mobile-origin entry linked to that device, always requiring enabled monitoring, the same user, and a non-revoked device.

- [ ] **Step 1: Add failing authorization tests** for allowed linked mobile entries, denied unlinked mobile entries, denied disabled monitoring, denied wrong user, denied revoked device, and unchanged desktop-origin behavior.
- [ ] **Step 2: Run `npm test -- --runInBand src/__tests__/desktopCompanionPresence.test.ts src/__tests__/desktopPresenceAuthorization.test.ts`** and confirm companion writes are rejected by current desktop-only checks.
- [ ] **Step 3: Implement the additive companion-link fields and server-side presence authorization**; recheck link ownership on every `POST /api/attendance/desktop/activity` and clear/disable links on clock-out or device revocation.
- [ ] **Step 4: Run companion and existing desktop-presence tests** with the same targeted Jest command; all must pass.

### Task 4: Add the pairing-code fallback to Flutter

**Files:**
- Modify: Flutter `lib/features/dashboard/data/datasources/dashboard_remote_data_source.dart`
- Modify: Flutter `lib/features/dashboard/data/repositories/dashboard_repository_impl.dart`
- Modify: Flutter dashboard repository/use case only if the existing clock action boundary requires it
- Modify: Flutter `lib/features/dashboard/presentation/widgets/utility_cards.dart`
- Create: Flutter `lib/features/dashboard/presentation/widgets/desktop_pairing_code_dialog.dart`
- Test: Flutter `test/features/dashboard/desktop_pairing_code_dialog_test.dart`
- Test: Flutter dashboard remote-data-source tests under `test/features/dashboard/`

**Interfaces:**
- Add a data-source operation `Future<DesktopPairingChallenge> createDesktopPairingChallenge(String workspaceId)` calling the authenticated challenge endpoint.
- The dialog displays the returned one-time code and expiry, with copy and close actions; it does not alter clock state.

- [ ] **Step 1: Write a failing widget/API test** asserting that the challenge is requested only for the current user's active mobile shift, shown with its expiry, and never logs or persists the raw code.
- [ ] **Step 2: Run the targeted Flutter test** with `flutter test test/features/dashboard/desktop_pairing_code_dialog_test.dart`; confirm the new dialog and API method are missing.
- [ ] **Step 3: Implement the challenge model/data-source method and dialog** and connect the fallback action to the existing clock UI without replacing its location-aware `mobile-toggle` request.
- [ ] **Step 4: Run `flutter test test/features/dashboard/desktop_pairing_code_dialog_test.dart` and `flutter analyze`** from `D:\Windows_Projects\TeamsEver`; both must pass. Review `git diff` first and preserve all pre-existing modified and untracked files.

### Task 5: Add Electron discovery, prompt, and companion tracking

**Files:**
- Modify: frontend `desktop/src/main/index.ts`
- Modify: frontend `desktop/src/preload/index.ts`
- Modify: frontend `src/types/desktop.d.ts`
- Modify: frontend `src/lib/desktopAttendance.ts`
- Create: frontend `src/components/analytics/DesktopCompanionPrompt.tsx`
- Modify: frontend `src/components/analytics/DesktopAttendanceControls.tsx`
- Modify: frontend `src/components/layout/ClientLayout.tsx`
- Test: frontend `desktop/src/main/companion.test.ts`
- Test: frontend `src/components/analytics/DesktopCompanionPrompt.test.tsx`

**Interfaces:**
- Add a narrow preload bridge for `getCompanionCandidate`, `acceptCompanionLink`, and `claimPairingCode`; raw device credentials remain inside Electron main-process `authorizedFetch`.
- Main process polls `GET /attendance/desktop/companion-candidate` every 20 seconds only while a credential is installed and a user session is active. It sends only a minimal candidate DTO to the trusted renderer.
- The first prompt exposes **Sync this time**, **Always sync future mobile shifts**, and **Not now**, plus a manual code-entry fallback. Always-sync is stored server-side per trusted desktop, auto-links only later same-IP candidates, and can be disabled in desktop settings. Decline is remembered for the current candidate so it does not repeatedly nag; a new time entry can produce a new prompt.

- [ ] **Step 1: Write failing Electron/React tests** for candidate delivery, decline suppression, one-time accept, always-sync selection with future prompt-free same-IP linking, disabling always-sync, code-claim flow, and stopping samples on clock-out, unlink, revocation, or disabled monitoring.
- [ ] **Step 2: Run `npm --prefix desktop test` and `npm test -- --run src/components/analytics/DesktopCompanionPrompt.test.tsx`**; confirm bridge and prompt behavior are absent.
- [ ] **Step 3: Implement main-process polling and the validated preload API** in `desktop/src/main/index.ts` and `desktop/src/preload/index.ts`. Keep polling, credential use, and server authorization outside page JavaScript.
- [ ] **Step 4: Implement and mount the prompt** in `DesktopCompanionPrompt.tsx` and `ClientLayout.tsx`; after accepted link, update the active tracking target but leave clock controls and source labels as mobile-origin.
- [ ] **Step 5: Run `npm --prefix desktop run typecheck && npm --prefix desktop test && npm --prefix desktop run build` and `npm test -- --run src/components/analytics/DesktopCompanionPrompt.test.tsx src/components/analytics/ClockInOut.test.tsx`**; all must pass.

### Task 6: End-to-end companion verification

**Files:**
- Modify: backend `src/__tests__/desktopCompanionPairing.test.ts` if cross-request fixtures need additions
- Modify: Flutter pairing tests from Task 4
- Modify: frontend companion tests from Task 5
- Create: `docs/superpowers/plans/` test notes only if a reproducible manual QA checklist is needed

- [ ] **Step 1: Run backend focused suite** for mobile source, companion discovery/pairing, presence authorization, device routes, and desktop clock authorization.
- [ ] **Step 2: Run Flutter focused tests and analyze** in the actual Flutter checkout; verify no existing dirty changes were dropped.
- [ ] **Step 3: Run frontend and Electron focused tests, typecheck, and builds**; verify mobile-origin shifts are never displayed or serialized as desktop-origin shifts.
- [ ] **Step 4: Execute the release-like manual test matrix**: same IP accept; same IP decline; mismatched IP plus pairing code; two workspaces; expired/replayed code; mobile clock-out; desktop revoke; monitoring disabled; offline desktop recovery.
- [ ] **Step 5: Inspect `git status` and `git diff --check` in each repository**. Leave all changes local and unpushed.
