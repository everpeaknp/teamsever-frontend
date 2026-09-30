# TeamsEver Desktop Presence and AFK Design

## Goal

During a consented shift started on a trusted TeamsEver desktop, show a privacy-limited timeline of the foreground application and whether the user appears active or AFK. Report tracking outages as gaps, never as AFK, and expose platform capability limits clearly.

## User-approved requirements

1. Record the foreground application name (for example, Chrome, VS Code, or Kiro).
2. Detect keyboard/mouse presence without recording key contents, text, click targets, pointer paths, screenshots, or raw input counts.
3. Mark AFK after an inactivity threshold and return to active when input resumes.
4. Show a timeline of active/AFK state alongside the foreground app.
5. Keep missing heartbeats as a distinct tracking gap; never infer AFK or modify attendance times from a gap.
6. Require explicit per-device consent and an active shift clocked in from that trusted desktop.
7. Show app and input-monitoring support independently for the current platform/session.

## Proposed behavior

- Use Electron's OS idle-time signal (`powerMonitor.getSystemIdleTime`) locally to detect input recency. Do not install a keylogger or global keyboard/mouse hook. Do not persist or transmit key/click counts.
- Sample capabilities and state once per 15 seconds. Submit a bounded heartbeat at least once per 60 seconds while monitoring is enabled, including the foreground process identifier where supported and an `active` or `afk` state. Use the existing 90-second backend missing-heartbeat threshold. Each stored interval is capped at five minutes, matching current validation.
- Use a default AFK threshold of 5 minutes. Make the threshold a workspace desktop-presence setting, configurable from 1 through 60 minutes by the workspace owner or a member already authorized to manage attendance policy. Keep it separate from the location geofence policy. If idle-time capability is unavailable, report input status as unavailable rather than guessing active/AFK.
- A foreground-app capability failure does not suppress idle-state reporting if idle detection remains available, and vice versa. Linux Wayland must state that foreground application identification is unavailable; capability probing determines whether OS idle-time detection is available there. Existing Windows and Linux X11 foreground-app detection remains supported. Other platforms report unsupported capabilities.
- Start reporting only when the backend confirms both a running time entry started from this device and server-side consent for that device. Stop immediately on clock-out, consent withdrawal, device revocation, or loss of the qualifying shift.
- A missed heartbeat creates or extends a `presence_heartbeat_missing` gap. On recovery, resume a new state interval; never fill the gap with an inferred status or app.
- Managers with existing authorized team attendance visibility can inspect member timelines. A member can inspect their own timeline. Do not broaden access to private device credentials or add an unrelated permission.
- Keep this feature informational. It must not change clock-in/out times, payroll duration, or automatically discipline a user. Input/app signals indicate computer presence, not productivity or identity assurance.

## Data and interfaces

- Extend the existing desktop presence interval with an enum `presenceStatus: active | afk | unavailable`; keep `appId` nullable so an idle interval can be stored where foreground-app lookup is unavailable.
- Include the reported status and separate foreground-app/idle-detection capability flags in the existing device-authenticated presence heartbeat. The backend continues to bind each event to the authenticated device, user, workspace, and active desktop-origin time entry; it validates status, interval bounds, consent, and ownership server-side.
- Add `desktopPresencePolicy.afkThresholdMinutes` with a default of 5 and accepted integer range 1–60 minutes. Read and update it through dedicated desktop-presence policy APIs with the existing workspace authorization rules.
- Extend the existing presence-history response with status intervals and capability/unavailable metadata. Preserve existing `events` and `gaps` behavior for compatibility.
- Add an attendance presence timeline view with user, time range, status intervals, foreground app when available, and separate tracking-gap spans. Display unsupported capability states explicitly; never render a gap as AFK.

## Privacy and security

- Raw OS idle time is read locally and reduced to active/AFK. No key values, text, click coordinates, pointer paths, window titles, browser URLs, screenshots, clipboard, or document contents are collected.
- Counts of keys/clicks are neither saved nor transmitted. The user-facing consent text describes app-name and active/AFK reporting and identifies unavailable signals.
- Device credentials remain OS-encrypted locally and one-way hashed server-side. Presence write APIs require the trusted device credential and repeat all time-entry and consent checks.
- Reports use the existing self/team attendance authorization boundary. A tracking gap is an observation outage, not evidence of absence.

## Acceptance criteria

1. Input before the AFK threshold reports `active`; idle time at or beyond the configured threshold reports `afk`; new input returns to `active`.
2. The default threshold is 5 minutes; values below 1, above 60, fractional, or non-numeric are rejected server-side without changing geofence settings.
3. Tests prove no API payload or persisted model contains raw key/click counts or content.
4. App lookup and idle detection capabilities can independently be supported or unavailable, and the UI reports each accurately.
5. Monitoring starts only for a consented desktop-origin active entry, and stops when the entry ends, consent is revoked, or device is revoked.
6. A heartbeat outage remains a separate gap; recovery does not backfill app or AFK intervals, and no gap changes clock timestamps/duration.
7. The attendance UI renders active, AFK, unknown/unavailable, and gap intervals distinctly with existing authorization behavior.
8. Windows and Linux X11 builds/tests pass. Linux Wayland and unsupported platforms show capability status without breaking desktop clock-in/out.
9. All changes remain local and unpushed until the user explicitly asks to publish them.

## Assumptions to verify during implementation

- Electron's idle-time API is available in the packaged runtime for each target session. Runtime capability probing, not platform-name assumptions, decides whether idle reporting is available.
- The existing workspace attendance-policy authorization is the right gate for changing the AFK threshold; implementation must reuse the repository's established permission checks, in a desktop-presence setting separate from geofences.
- Existing presence/gap report APIs can be extended compatibly; database migration is additive because new status data is nullable for historical rows.
