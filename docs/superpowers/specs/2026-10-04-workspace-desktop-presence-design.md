# Workspace Presence Roster and Member Activity History

**Status:** Approved by user; implementation plan review pending
**Date:** 2026-10-04

## Goal

Replace the mobile screen's raw, oversized app-usage dump with a person-first workspace presence experience. Any authenticated active workspace member can see coworkers' current consented desktop presence, like a Discord activity roster. Only an authorized workspace admin can open an individual member's detailed, date-filtered app-usage timeline. Detailed histories stay scoped to one selected person and are loaded in pages.

## User-approved behavior

- Show one current-presence row per workspace member, not a merged list of every member's historical app intervals.
- Workspace members can see a coworker's current foreground app and active/AFK state when that coworker has an active, consented desktop companion reporting fresh samples.
- When no fresh sample is available, show a clear neutral state such as “Not sharing desktop presence” or “Desktop not reporting”; never reuse an old app as if it were current.
- Clicking a member's presence row opens that member's detailed history only for viewers authorized to manage attendance. The history is a single-person view with a date range, app summary, activity-state totals, gaps, and a paginated timeline.
- Keep all requested app-history data within the selected workspace and member. Do not mix multiple people's timelines into one feed.
- Provide the same person-first model in Flutter and web. Keep the current web team timeline's team selector as a way to choose one person, rather than a team-wide history feed.
- Preserve the existing desktop consent, trusted-device pairing, same-user identity, mobile clock attribution, and location behavior. App history is shown only when presence sharing is enabled for the trusted desktop and the active shift is linked.

## Access and privacy

- The current-presence roster requires authentication and active membership in the requested workspace. It exposes only each member's latest fresh consented app identifier, active/AFK state, and report time. It does not expose past events, gaps, location, attendance time, or private device details.
- A member without a fresh eligible sample has the same neutral “Not reporting” state, whether they are clocked out, unpaired, opted out, unsupported, or stale. Do not reveal which condition applies, imply AFK, or report an old app as current.
- Detailed history and range summaries require workspace ownership or the existing attendance-management permissions (`MANAGE_ADDRESSES` or `MANAGE_ATTENDANCE_LOCATIONS`). The backend rechecks permission for every page and summary request; hiding controls in the client is not authorization.
- Detail requests accept exactly one target member. They reject `userId=all`; team history is not a supported detail view.
- Preserve same-user desktop pairing enforcement and explicit presence consent. A shared IP is discovery context only and never an identity check.

## API design

### Current roster

Add an authenticated, workspace-scoped current-presence endpoint. Return a stable page of workspace members with a compact current-presence object, not event history. Use a bounded page size and opaque continuation cursor; include `nextCursor` and `hasMore`. Each subsequent page repeats workspace membership validation. Results are person-oriented and contain no per-person usage totals.

### Single-member history

Extend the existing desktop-activity API for a single `userId`, inclusive start/end dates, bounded page size (default 50, maximum 100), and opaque keyset cursor. Keep the current 90-day maximum. Return a chronologically descending page of combined presence intervals and tracking gaps, plus `nextCursor` and `hasMore`.

Return range-wide summary aggregates separately from page items so an admin sees accurate totals without downloading every interval. Summary includes app duration/session totals, active/AFK duration, and tracking-gap duration; gaps remain unknown time and are never counted as active or AFK. Use database aggregation and existing indexed time/user/workspace fields where possible. The first page may include the range summary; later pages need not repeat it unless the range or member changes.

Validate cursor shape, date bounds, page-size limits, workspace membership, target member, and admin permission on the server. Cursor pagination must use a deterministic timestamp/id/kind order so event and gap records at the same time are neither duplicated nor skipped. Continue to synthesize an ongoing gap only for a genuinely stale active reporter; do not manufacture an app event from it.

## Flutter experience

- The Attendance desktop-presence view opens to a searchable, person-wise current roster with a small app icon, normalized app label, active/AFK state, and freshness indicator. Use the same neutral “Not reporting” state when there is no fresh presence; do not show a fabricated zero-minute application row or reveal why reporting is absent.
- All members can view current presence rows. Only admins with the backend permission see a row action to open that member's history.
- The history screen shows the selected person's identity and date range, compact aggregate cards, a short ranked app-usage summary, and a day-grouped timeline. Load the first page, then a “Load more” affordance/infinite scroll using the API cursor. Keep empty, loading, retry, and stale-cursor states understandable.
- Do not render all app identifiers in a long flat usage list. Show top apps and a deliberate “Show all apps” expansion if the aggregate has more entries.
- Retain the existing one-time mobile-to-desktop code fallback on the user's own current-shift context, not on another member's row.

## Web experience

- Keep the current desktop presence/reporter diagnostics for the desktop user on their own device.
- Replace team-wide historical rows with a person selector and one-person history. The current-presence roster is workspace-visible; selecting a person for history remains admin-only.
- Paginate history from the same API and render summary aggregates independently of the current page. Preserve the current app icon mapping and status labels.

## Data and failure handling

- Normalize application ids for display (`whatsapp.root` → WhatsApp, `.exe` removed) while retaining the raw safe process identifier for aggregation and audit.
- Missing samples are tracking gaps, not AFK. A stale last app must never appear as current; freshness is determined server-side using the existing heartbeat threshold.
- If a member loses workspace membership or the viewer loses admin permission between pages, stop requests and show an access message; do not keep appending cached pages for the revoked scope.
- If a cursor is invalid or incompatible with the selected member/date range, return a clear client error and allow restarting at page one.
- Do not change attendance durations, clock source, mobile location validation, or leave workflows.

## Acceptance criteria

1. A regular active workspace member can view one current-presence row for every workspace member, but cannot request another member's history or summaries.
2. Current presence shows only a fresh, consented report and otherwise clearly reports unavailable/not sharing; it never labels an old app as current or a gap as AFK.
3. An authorized admin can select one member and see that member's range summary and detailed timeline; they cannot load all members' detailed histories in one request.
4. Current roster and timeline APIs are paginated with bounded page sizes; later pages neither duplicate nor omit rows at identical timestamps.
5. App duration/session, active/AFK, and gap summaries cover the selected range without sending all raw intervals to the client. Unknown gap time is excluded from active/AFK totals.
6. Flutter and web show person-wise current presence and a single-person admin detail flow, with loading, empty, error, and pagination states.
7. Existing same-user pairing, trusted-device monitoring consent, mobile clock/location attribution, web desktop diagnostics, and clock duration remain unchanged.
8. Tests cover current-roster visibility, detail authorization, cursor boundaries/ties, range aggregate correctness, stale reporter behavior, and both clients' paging/member selection.

## Out of scope

- A workspace-wide historical activity feed containing multiple people's intervals.
- Exposing detailed histories or aggregates to regular members.
- Changing how desktop presence is collected, its sample cadence, or consent requirements.
- Using mobile GPS or IP as evidence in desktop presence access decisions.
