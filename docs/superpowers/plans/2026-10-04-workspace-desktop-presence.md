# Workspace Presence Roster and Member Activity History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a Discord-style current-presence roster to workspace members and let authorized admins open one person's paginated desktop-usage history.

**Architecture:** The backend adds a compact, paginated roster endpoint and upgrades the history endpoint to return one authorized member's stable cursor-paged event/gap feed plus server-computed range summaries. Flutter and web render a person-first roster; selecting a person opens a single-member detail view only when the backend says the viewer has history permission, and every page request rechecks that permission.

**Tech Stack:** Node.js/Express, TypeScript, MongoDB/Mongoose, Jest/Supertest; Flutter/Dart/BLoC/Dio; Next.js/React/Vitest/Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-04-workspace-desktop-presence-design.md`

## Global Constraints

- Current presence is visible only to authenticated active members of the same workspace.
- Only a workspace owner or viewer with `MANAGE_ADDRESSES` or `MANAGE_ATTENDANCE_LOCATIONS` can request any member's detailed history or range summary.
- Current presence contains only a fresh consented foreground app id, active/AFK state, and report time; absent/stale samples return the same neutral “Not reporting” state.
- History requests select exactly one member; reject `userId=all` and never combine multiple members' histories.
- Page size defaults to 50 and values above 100 are rejected; date ranges are capped at 90 days.
- Cursor ordering is deterministic by timestamp, record id, and record kind; same-time event/gap rows must not be duplicated or skipped.
- App totals cover the selected range without sending every raw interval to clients; tracking gaps count as unknown, never active or AFK.
- Preserve trusted-device consent, same-user mobile/desktop pairing, mobile attendance attribution, location enforcement, clock durations, and desktop self-reporter diagnostics.
- Do not push or publish any changes.

## Review Focus

- A stale heartbeat must never display the last app as current; test the 90-second freshness boundary in the roster controller/service.
- A member loses admin permission between history pages; test that the next cursor request is denied and cannot reuse cached data.
- Event and gap rows share an identical timestamp; test cursor tie ordering returns each once across page boundaries.
- Clocked-out, unpaired, unsupported, and consent-disabled states all map to the same neutral roster state; test no detail leaks.
- Empty, reversed, over-90-day, malformed-cursor, and maximum-page-size inputs must have explicit bounded responses; pin validation in endpoint tests.

## File Map

- Backend roster query/controller: `src/controllers/desktopAttendanceController.ts`; route: `src/routes/attendanceLocationRoutes.ts`.
- Backend timeline pagination and aggregation helpers: create `src/services/desktopPresencePagination.ts`; presence and gap indexes: `src/models/DesktopAppPresence.ts`, `src/models/DesktopTrackingGap.ts`.
- Backend tests: create/extend `src/__tests__/desktopPresenceCurrentRoster.test.ts`, `src/__tests__/desktopPresenceTimeline.test.ts`, and `src/__tests__/desktopPresencePagination.test.ts`.
- Flutter data contract: modify `lib/features/attendance/domain/entities/desktop_presence_timeline_entity.dart`, `lib/features/attendance/data/models/desktop_presence_timeline_model.dart`, `lib/features/attendance/domain/repositories/attendance_repository.dart`, `lib/features/attendance/data/datasources/attendance_remote_data_source.dart`, and `lib/features/attendance/data/repositories/attendance_repository_impl.dart`; create roster entities/models as needed.
- Flutter state and UI: modify `lib/features/attendance/presentation/bloc/desktop_presence_cubit.dart` and `lib/features/attendance/presentation/widgets/desktop_presence_panel.dart`; create a single-member history screen/widget. Keep mobile pairing-code creation in the user's own attendance context only.
- Web UI/data: refactor `src/components/attendance/DesktopPresenceTimeline.tsx` into a person roster and single-member detail flow; preserve `src/components/attendance/desktopAppUsage.ts` normalization and `DesktopAppIcon.tsx`. Add focused Vitest coverage beside the components.

---

### Task 1: Paginated workspace current-presence roster API

**Files:**
- Modify: `src/routes/attendanceLocationRoutes.ts`
- Modify: `src/controllers/desktopAttendanceController.ts`
- Create: `src/services/desktopPresencePagination.ts`
- Modify: `src/models/DesktopAppPresence.ts`
- Modify: `src/models/DesktopTrackingGap.ts`
- Test: `src/__tests__/desktopPresenceCurrentRoster.test.ts`
- Test: `src/__tests__/desktopPresencePagination.test.ts`

**Interfaces:**
- Produces `GET /workspace/:workspaceId/desktop-presence/current?cursor=<opaque>&pageSize=50`.
- Response: `{ success: true, data: { members: Array<{ userId: string; displayName: string; avatar: string | null; presence: null | { appId: string | null; presenceStatus: 'active' | 'afk'; reportedAt: string } }>; pagination: { nextCursor: string | null; hasMore: boolean; pageSize: number }; permissions: { canViewHistory: boolean } } }`.
- Sort pages by normalized display name then user id so a changing presence state cannot move a member across cursor pages. Include active workspace members and the owner. Project only workspace membership references, form the ordered member page, then fetch latest eligible report data only for those page user ids. A sample is current only if it belongs to that user's running shift, its trusted device remains consent-enabled, and `reportedAt` is within the existing 90-second heartbeat threshold. All other conditions return `presence: null` without explaining why.
- `permissions.canViewHistory` is computed for the authenticated viewer using workspace ownership and the existing two attendance-management permissions. It is a UI hint only; history routes still enforce permissions.
- Cursor helpers expose `encodeRosterCursor(name: string, userId: string): string` and `decodeRosterCursor(cursor: string): { name: string; userId: string }`; reject malformed cursors with HTTP 400. Bound `pageSize` to default 50, maximum 100.

- [ ] **Step 1: Add failing route tests** named `returns one current row per active workspace member`, `allows an ordinary member to read only compact current presence`, `returns the same unavailable shape for stale/unpaired/consent-disabled users`, `returns viewer history capability without granting it`, `rejects unauthenticated or nonmember callers`, `paginates roster rows by stable name/user cursor`, and `rejects an invalid cursor`.
- [ ] **Step 2: Run** `npm test -- --runInBand src/__tests__/desktopPresenceCurrentRoster.test.ts src/__tests__/desktopPresencePagination.test.ts`; confirm the missing route/contract fails.
- [ ] **Step 3: Implement** the route and `getWorkspaceCurrentPresence` handler. Project workspace member references, order and cursor-page those references, then query the latest eligible event only for page user ids; return only app id, status, and report timestamp. Reuse `shouldFlagMissingPresenceHeartbeat` and existing permission helper; never return raw time entries, locations, device ids, old intervals, or reason-specific unavailable states.
- [ ] **Step 4: Add compound indexes** for current latest-by-member reporting and the history keyset fields in the two presence models; retain existing indexes required by active-write paths.
- [ ] **Step 5: Run** the focused Jest suite and `npm run build`; expect all new route tests and TypeScript compilation to pass.
- [ ] **Step 6: Commit** as `feat(presence): add paginated workspace current roster`.

### Task 2: Authorized single-member cursor history and range summary API

**Files:**
- Modify: `src/controllers/desktopAttendanceController.ts`
- Modify: `src/services/desktopPresencePagination.ts`
- Modify: `src/routes/attendanceLocationRoutes.ts` only if route validation is needed.
- Test: `src/__tests__/desktopPresenceTimeline.test.ts`
- Test: `src/__tests__/desktopPresencePagination.test.ts`

**Interfaces:**
- Extend `GET /workspace/:workspaceId/desktop-activity` with required `userId`, `startDate`, `endDate`, optional `cursor`, and `pageSize`.
- Reject missing `userId`, `userId=all`, unauthorized viewers, inactive/unknown target members, invalid/reversed dates, ranges over 90 days, page sizes outside 1–100, and malformed or cross-scope cursors. `pageSize` defaults to 50; values above 100 are rejected with HTTP 400.
- Response: `{ success: true, data: { member: { userId: string; displayName: string; avatar: string | null }; summary: { apps: Array<{ appId: string; durationMs: number; sessions: number }>; activeMs: number; afkMs: number; gapMs: number } | null; items: Array<{ kind: 'app'; id: string; appId: string | null; presenceStatus: 'active' | 'afk'; foregroundAppSupported: boolean; idleDetectionSupported: boolean; startedAt: string; endedAt: string } | { kind: 'gap'; id: string; reason: string; active: boolean; startedAt: string; endedAt: string }>; pagination: { nextCursor: string | null; hasMore: boolean; pageSize: number } } }`.
- Cursor is opaque and bound to workspace, member, range; order by `startedAt DESC`, `id DESC`, then fixed `kind` rank (`app` before `gap`). Use a Mongo aggregation/union pipeline so the API fetches one merged page, not all event/gap rows. Encode/decode these fields in one tested cursor helper, and use the same order predicate for the next-page query.
- Compute the full-range summary in MongoDB. A new app session begins on first event, app change, or a gap greater than 90 seconds within the same time entry. Sum app durations and session starts by app id; sum active and AFK durations separately; sum gaps as unknown time. Return summary on page one only; later pages return `summary: null`.
- Keep ongoing-gap synthesis for a stale active reporter, but include it only if its timestamp belongs in the selected keyset page and never convert it into an app event.

- [ ] **Step 1: Update/add failing tests** named `requires exactly one target member`, `rejects team-wide userId=all`, `allows an authorized admin to page one member`, `rejects a regular member even when requesting the current detailed timeline`, `rechecks authorization on each cursor request`, `returns only pageSize merged items and a stable next cursor`, `does not duplicate/skip same-timestamp event and gap rows`, `computes full-range per-app and active/AFK/gap totals`, `merges adjacent samples into sessions and splits after app changes or 90-second gaps`, and `rejects invalid range/page size/cursor scopes`.
- [ ] **Step 2: Run** `npm test -- --runInBand src/__tests__/desktopPresenceTimeline.test.ts src/__tests__/desktopPresencePagination.test.ts`; confirm assertions fail against the current unpaged response.
- [ ] **Step 3: Implement** deterministic cursor encode/decode and the merged aggregation in `desktopPresencePagination.ts`; apply workspace/member/date filters and validate cursor binding before query execution, and enforce viewer permission before both page and summary queries.
- [ ] **Step 4: Update** `getAppPresence` to the single-member response contract and return only the requested slice and first-page summary. Remove team-wide history output and keep current-presence roster as the distinct workspace-visible API from Task 1.
- [ ] **Step 5: Run** focused Jest tests, the existing desktop presence policy/API tests, and `npm run build`; expect cursor tie, access, and aggregate tests to pass.
- [ ] **Step 6: Commit** as `feat(presence): paginate member activity history`.

### Task 3: Flutter person roster and admin member history

**Files:**
- Modify: Flutter repository/data source/model/entity files listed in File Map.
- Modify: `lib/features/attendance/presentation/bloc/desktop_presence_cubit.dart`
- Modify: `lib/features/attendance/presentation/widgets/desktop_presence_panel.dart`
- Create: `lib/features/attendance/presentation/widgets/desktop_presence_member_history.dart`
- Modify/create: Flutter data, cubit, and widget tests under `test/`.

**Interfaces:**
- Data source methods: `getCurrentDesktopPresence({required String workspaceId, String? cursor, int pageSize = 50})` and `getDesktopPresenceHistory({required String workspaceId, required String userId, required DateTime startDate, required DateTime endDate, String? cursor, int pageSize = 50})`.
- Cubit methods: `loadRoster({String? cursor})`, `loadMoreRoster()`, `openMemberHistory({required String userId, required DateTime startDate, required DateTime endDate})`, and `loadMoreHistory()`; state keeps roster pages separate from exactly one selected member's summary/items.
- Client may show history actions only when `permissions.canViewHistory` is true. API 403 clears selected pages and shows access revoked; never infer authorization from workspace role labels.

- [ ] **Step 1: Add failing data/model tests** for roster DTO parsing, unavailable rows, paged timeline union items, summary parsing, `nextCursor`, and absent-summary later pages.
- [ ] **Step 2: Run** the focused Flutter data tests and confirm missing contract methods/fields fail.
- [ ] **Step 3: Implement** repository and datasource methods against Task 1 and Task 2 response shapes; preserve existing own-shift pairing-code call but expose it only in the current user's attendance control.
- [ ] **Step 4: Add failing cubit tests** named `loads current roster page`, `appends roster without duplicates`, `opens only one member history`, `loads additional cursor pages`, `clears prior member data when selection changes`, and `clears access-scoped data on 403`.
- [ ] **Step 5: Implement** `DesktopPresenceCubit` with independent roster/history loading, cursor, retry, and member/range reset behavior.
- [ ] **Step 6: Add failing widget tests** at 360px and 390px asserting one person per roster card, app icon/name/Active/AFK/freshness layout, neutral Not reporting, regular-user no-detail action, admin detail navigation, summary/top-apps, day grouping, and Load more.
- [ ] **Step 7: Implement** Discord-like roster as the default view; make each row a person, show a presence line rather than historical app-duration rows, and open a separate admin-only single-person history screen. Show top apps with an explicit expansion, compact active/AFK/unknown summary, and day-grouped cursor timeline. Keep loading/empty/error/refresh states and mobile spacing/accessibility.
- [ ] **Step 8: Run** focused Flutter tests, full `flutter test`, and `flutter analyze` on changed files; expect the entire test suite and focused analyzer to pass.
- [ ] **Step 9: Commit** as `feat(mobile): add person-first desktop presence`.

### Task 4: Web person roster and single-member paginated history

**Files:**
- Refactor: `src/components/attendance/DesktopPresenceTimeline.tsx`
- Modify: `src/components/attendance/desktopAppUsage.ts` only for shared label/session mapping if needed.
- Reuse: `src/components/attendance/DesktopAppIcon.tsx`
- Create focused roster/history components under `src/components/attendance/` if needed to keep the page maintainable.
- Test: `src/components/attendance/DesktopPresenceTimeline.spec.tsx` and new focused component tests if split.

**Interfaces:**
- Use Task 1 `GET .../desktop-presence/current` for the workspace-visible roster.
- Use Task 2 `GET .../desktop-activity?userId=<one member>&startDate=...&endDate=...&pageSize=50&cursor=...` for admin-selected history.
- Preserve Electron-only own-device diagnostics, current local app timer, reporter status, and mobile pairing controls in a distinct “My desktop” context; do not show them on other members' detail rows.

- [ ] **Step 1: Add failing Vitest coverage** for workspace roster display, neutral unavailable rows, current app label/icon/status, admin-only detail action, one-member query scoping, append-page behavior, summary rendering, no team-wide event rendering, and preserving the current Electron self-reporter/pairing controls.
- [ ] **Step 2: Run** `npm test -- src/components/attendance/DesktopPresenceTimeline.spec.tsx`; confirm new UI/API expectations fail.
- [ ] **Step 3: Refactor** the web page into the current roster and one-member detail states. Show the roster first, display one app/status line per person, and only fetch a person history after an authorized admin selects one.
- [ ] **Step 4: Add** date-range summary cards, top-app summary, day-grouped items, and Load more using the backend cursor. Reset data/cursors on member or range changes and clear scoped state on 403.
- [ ] **Step 5: Verify** Electron local diagnostics, current app timer, automatic/short-code mobile pairing, current app icons, and responsive layouts remain available in the signed-in desktop self context.
- [ ] **Step 6: Run** focused and full `npm test`, `npm run build`; expect Vitest and production TypeScript/build to pass.
- [ ] **Step 7: Commit** as `feat(web): add person-first desktop presence`.

### Task 5: Cross-client contract and authorization review

**Files:**
- Modify focused API/client tests only where the final contract reveals an integration gap.
- No additional screen/API surface beyond Tasks 1–4.

- [ ] **Step 1: Run backend** `npm test -- --runInBand src/__tests__/desktopPresenceCurrentRoster.test.ts src/__tests__/desktopPresenceTimeline.test.ts src/__tests__/desktopPresencePagination.test.ts src/__tests__/desktopPresenceApi.test.ts src/__tests__/desktopPresencePolicy.test.ts` and `npm run build`.
- [ ] **Step 2: Run Flutter** `flutter test` and focused `flutter analyze` for attendance data/state/widgets.
- [ ] **Step 3: Run web** `npm test` and `npm run build`.
- [ ] **Step 4: Review all three diffs** for permission rechecks, cache/page reset on identity changes, app-name normalization, accidental IP/location/attendance leakage, gaps misrepresented as AFK, and no team-wide historical endpoint use.
- [ ] **Step 5: Confirm** all worktrees are clean and local commits exist on feature branches; do not push or publish.
