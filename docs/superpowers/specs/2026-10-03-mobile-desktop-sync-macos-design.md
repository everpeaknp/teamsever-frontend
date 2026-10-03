# TeamsEver Mobile-to-Desktop Presence and macOS Support

**Status:** Design approved in conversation; awaiting spec review before implementation planning
**Date:** 2026-10-03

## Goal

Let a user who clocks in with the TeamsEver Flutter mobile app optionally connect their already-paired Electron desktop to that same active shift for foreground-app presence. Expand Electron support to macOS, and provide native-app updates without requiring users to repeatedly find and download installers. Keep attendance attribution accurate and do not treat a shared IP address as identity proof.

## Current baseline

- The Electron app authenticates a trusted desktop using an OS-encrypted device credential and sends desktop-origin clock requests to the backend.
- The desktop status endpoint currently reports a running entry only when the entry belongs to that trusted desktop device. It cannot discover or attach to a mobile-origin shift.
- Foreground app sampling runs only when the backend says the trusted desktop has a qualifying active shift and activity monitoring is enabled. Windows process-name lookup and Linux/X11 lookup exist; macOS lookup does not.
- `electron-builder.yml` and the release workflow package Windows NSIS and Linux AppImage targets. The tagged release workflow creates a draft release. No native self-updater is configured.
- Electron loads the hosted web frontend. Frontend deployments can therefore appear in Electron after its web view reloads; changes to Electron's native code require a desktop release.
- The Flutter source repository is not in the current checked-out frontend/backend workspace. Its existing clock-in and location-policy implementation must be inspected before integration work; this spec does not assume that source has already been verified.

## Approved behavior

### Mobile-started shift and desktop companion

1. The user clocks in from Flutter. The backend records the shift once and keeps its source as `mobile`.
2. An authenticated, paired Electron installation for the same user periodically asks the backend whether there is an eligible mobile-started shift to connect to. The initial automatic discovery candidate requires the server-observed public client IP at mobile clock-in to match the desktop request IP. Only a short-lived keyed fingerprint is retained for comparison; the raw observed address is not added to attendance records.
3. Electron displays a clear notification/prompt with the workspace and shift context, offering **Sync desktop presence** and **Not now**. Matching IP only makes the candidate discoverable; the authenticated user must explicitly accept. If IP discovery is unavailable or mismatched, the user can use a short-lived pairing challenge shown in the authenticated mobile and desktop apps. The challenge is single-use, user-bound, and expires quickly.
4. On acceptance, the backend links that trusted desktop device to the existing mobile-started time entry. This is a companion relationship, not a second clock-in, a source change, or a way to bypass the location check performed at clock-in.
5. Electron reports foreground-app intervals against the linked entry only when that device's existing activity-monitoring setting is enabled. Do not add a repeated consent dialog at every clock-in. The pairing prompt tells the user that app presence will be shared; the existing monitoring setting remains authoritative.
6. Desktop presence stops on mobile clock-out, explicit unlink, device revocation, loss of authorization, or time-entry correction/cancellation. Desktop cannot clock out a mobile-started shift. Attendance duration and clock-in/out source remain unchanged by presence gaps.
7. At most one active companion desktop may be linked to a time entry. A new link requires replacing the old link explicitly. The user can see and revoke the link from the existing trusted-device controls.

### macOS desktop support

- Add macOS packaging for both Apple Silicon (`arm64`) and Intel (`x64`) using a universal build where practical, with a signed `.dmg` distribution artifact.
- Implement a macOS foreground-app adapter that returns only a stable process/bundle identifier. Do not collect window titles, URLs, document names, screenshots, or raw input. Probe capability at runtime and clearly report unavailable status if macOS permissions or the helper are unavailable.
- Use a small, auditable native macOS helper based on `NSWorkspace.frontmostApplication` if Electron/Node APIs do not provide reliable process identity. The helper must return only the identifier and must not request screen recording or accessibility permissions unless implementation proves they are required; any required OS permission must be explained in the UI.
- Preserve existing Windows and Linux behavior. Linux Wayland continues to report foreground-app detection as unavailable while allowing supported clocking behavior.
- Sign and notarize Mac builds in CI using protected Apple Developer credentials. Unsigned local development builds remain possible.

### Native desktop updates

- Configure a signed release feed for Windows, Linux, and macOS artifacts. Publishing a new stable desktop release makes a compatible update discoverable by installed clients.
- Download updates in the background and show a TeamsEver in-app notification when an update is ready. Never force-close the app or interrupt a running shift to install; prompt to restart to apply the update.
- Web-only deployments continue to be served by the hosted web app inside Electron and do not require rebuilding the Electron installer. Native desktop changes use the release updater.
- Release CI validates version/tag consistency, builds and tests all supported platforms, signs/notarizes macOS artifacts, attaches installer/update metadata to a published release, and records failures clearly. Drafts may be used for pre-release review, but clients must not install draft or prerelease builds as stable updates.

## Backend interfaces and data

- Extend the trusted-device status/discovery flow with an authenticated endpoint that returns only the current user's eligible mobile-origin active entry and whether it is discoverable. It must never return another member's shift or private attendance/location data.
- Add a device-authenticated, idempotent endpoint to accept a companion link, and a revoke/unlink operation. Bind link records to user, workspace, time entry, trusted device, creation/expiry time, and active state.
- Validate server-side that the caller owns the trusted device, the active time entry belongs to the same user, its source is mobile, the workspace membership remains valid, and no conflicting companion exists. Recheck these conditions for every presence write.
- Extend activity write authorization to allow a linked companion device for a mobile-origin time entry while preserving existing desktop-origin rules. Presence records remain bound to the authenticated reporting device and original time entry.
- Store only a keyed, short-lived client-IP fingerprint for automatic candidate discovery, derived through the configured trusted-proxy chain. Never accept a client-provided IP header as authoritative. The explicit pairing challenge is the fallback when reliable IP comparison is unavailable.
- Keep existing app-presence response compatibility. Historical entries with no companion link remain unchanged.

## Flutter and Electron responsibilities

- Flutter continues to own mobile clock-in/out and its existing location-policy request. It displays the pairing challenge only when the user chooses the fallback flow and reports successful clock-out so the backend can end the companion link through normal entry state.
- Electron polls only while a user has a valid paired desktop credential and the app is running. It presents the pairing choice, then samples foreground app identity at the existing cadence after an accepted link.
- Neither client uses IP as sole authorization. Neither client creates a second attendance entry for a companion connection.
- Mobile-to-desktop presence requires the Flutter repository to be available for source inspection and tests. If it is not available in the execution environment, complete backend/Electron work and report that integration as blocked rather than claiming it is done.

## Security, privacy, and failure handling

- Device credentials remain one-way hashed by the backend and encrypted by the operating system on-device.
- A failed discovery poll, IP mismatch, unavailable proxy address, unsupported OS API, or lost network must not alter attendance times. Show a recoverable status and allow the user to retry or use the pairing challenge.
- Expire unused pairing challenges and candidate fingerprints. Rate-limit discovery and challenge attempts. Make accept/revoke operations idempotent and audit link lifecycle events without logging secrets or raw IP addresses.
- Presence gaps remain gaps; never infer AFK or alter payroll duration from missing desktop reports.
- Updates are verified by the signed release mechanism and installed only after an explicit restart action. Do not install while the desktop reports an active shift.

## Acceptance criteria

1. A Flutter-origin shift remains `mobile` in API responses and attendance reports after desktop pairing; exactly one time entry exists.
2. A same-user, paired Electron client on the same observed public IP receives an eligible prompt; another user, another workspace member, an unpaired desktop, or a different-IP client does not receive that automatic candidate.
3. Accepting the prompt links the existing entry and permits presence writes only from the linked trusted device. Declining does not link or report presence.
4. The short-lived challenge fallback can securely link the same user's active mobile shift when automatic IP discovery is unavailable; expired, replayed, cross-user, or mismatched challenges fail.
5. Clock-out, unlink, revocation, and authorization loss stop further presence writes promptly. Clock source and attendance timestamps/duration remain unchanged.
6. Existing desktop-origin clocking and presence remain functional. Presence data remains limited to app identifiers and bounded intervals.
7. macOS arm64 and x64 builds launch, authenticate, clock through the existing policy, detect foreground app identity where supported, and report capability limitations accurately.
8. Mac release artifacts are signed and notarized in CI. Invalid or missing signing credentials fail the Mac release job clearly without blocking Windows/Linux packaging.
9. A published stable release is discovered and downloaded by installed Windows, Linux, and macOS clients; installation waits for user restart and is deferred while a shift is active.
10. CI exercises the pairing API authorization, race/idempotency behavior, IP candidate rules, challenge expiry/replay, clock-out/revocation shutdown, update metadata, and platform packaging checks.
11. No changes are pushed to a remote until the user explicitly requests a push.

## Out of scope

- Using IP matching as proof of physical location or as a replacement for mobile location enforcement.
- Allowing Electron to clock out a shift started by Flutter.
- Recording key strokes, mouse counts/paths, window titles, URLs, screenshots, or document contents.
- Adding a Flutter mobile app implementation to the frontend/backend repositories; Flutter work must happen in its actual repository.
- Changing location geofence sizes or existing attendance source attribution.
