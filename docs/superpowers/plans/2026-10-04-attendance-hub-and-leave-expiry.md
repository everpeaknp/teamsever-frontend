# Attendance Hub and Leave Expiry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make attendance workflows easy to navigate in web and Flutter, and make pending leave/remote requests expire consistently using the workspace timezone.

**Architecture:** The backend owns the workspace IANA timezone and the authoritative pending-to-expired transition. Web and Flutter consume the same request status contract, present the same distinct attendance sections, and preserve existing clock, permissions, privacy, and desktop-presence behavior.

**Tech Stack:** Node.js, TypeScript, Express, Mongoose, Jest; Next.js, React, TypeScript, Vitest; Flutter/Dart, BLoC, Dio, flutter_test.

**Spec:** `docs/superpowers/specs/2026-10-04-attendance-workspace-and-leave-expiry-design.md`

## Global Constraints

- Use the workspace IANA timezone for date cutoffs; legacy workspaces without a configured value fall back to UTC.
- Expire leave and remote requests at the start of their `endDate` calendar day; do not alter already approved or denied requests.
- Expired requests remain in history and cannot be approved or denied.
- Keep A→B request privacy and assigned-reviewer/owner authorization unchanged.
- Flutter displays desktop-reported presence and must not claim the phone detects laptop apps or AFK state.
- Keep existing clock sources, attendance calculations, location enforcement, desktop device pairing, and desktop presence collection unchanged.
- Keep the existing Flutter bottom navigation; organize the Attendance destination with its own distinct sections.

## Review Focus

- UTC midnight compared with a non-UTC workspace date — verify expiry uses the configured workspace date, including Kathmandu and a daylight-saving timezone.
- Manager acts from a stale approval card after expiry — API must reject the transition and clients must render Expired.
- Scheduled expiry and an approval race — only one terminal status and its matching side effects may win.
- Unauthorized members open workspace settings, team presence, or another member’s request — backend and clients retain current permission boundaries.
- Mobile request cards and older DM cards — expired status must render without decision buttons, while pending/approved/denied cards continue working.

---

### Task 1: Backend workspace timezone contract

**Files:**
- Modify: `teamsever-backend/src/models/Workspace.ts`
- Modify: `teamsever-backend/src/controllers/workspaceController.ts`
- Modify: `teamsever-backend/src/services/workspaceService.ts`
- Modify: `teamsever-backend/src/routes/workspaceRoutes.ts`
- Test: `teamsever-backend/src/__tests__/workspaceTimezone.test.ts`
- Modify: `teamsever-frontend/src/app/workspace/[id]/settings/page.tsx`
- Test: `teamsever-frontend/src/app/workspace/[id]/settings/page.spec.tsx` (or the existing settings test location)
- Modify: `TeamsEver/lib/features/workspace/domain/entities/workspace_entity.dart`
- Modify: `TeamsEver/lib/features/workspace/data/models/workspace_model.dart`
- Modify: `TeamsEver/lib/features/workspace/presentation/pages/workspace_settings_screen.dart`
- Test: `TeamsEver/test/features/workspace/data/models/workspace_timezone_test.dart`

**Interfaces:**
- Workspace JSON exposes `timezone` as an IANA zone string; legacy absence is interpreted as `UTC`.
- Existing authorized workspace update operation accepts `timezone`; invalid IANA values return HTTP 400.

- [ ] **Step 1: Write failing backend tests** for returning UTC fallback, accepting `Asia/Kathmandu`, rejecting an invalid zone, and denying an unauthorized update.
- [ ] **Step 2: Run tests to verify failure** with `npm test -- --runInBand src/__tests__/workspaceTimezone.test.ts` from `teamsever-backend`.
- [ ] **Step 3: Add the validated timezone field** to Workspace and the existing authorized update/read contract.
- [ ] **Step 4: Run the focused backend tests** and require all cases to pass.
- [ ] **Step 5: Add a timezone control** to web Workspace Settings → General, with a visible UTC fallback notice for legacy workspaces.
- [ ] **Step 6: Add matching Flutter workspace settings control** using the existing WorkspaceBloc update flow and permission behavior.
- [ ] **Step 7: Add client tests** for loading/saving the timezone and hiding controls without settings permission.

### Task 2: Backend leave/remote expiry lifecycle

**Files:**
- Modify: `teamsever-backend/src/models/LeaveRequest.ts`
- Modify: `teamsever-backend/src/services/leaveService.ts`
- Modify: `teamsever-backend/src/controllers/leaveController.ts`
- Modify: `teamsever-backend/src/routes/leaveRoutes.ts`
- Modify: `teamsever-backend/src/server.ts`
- Create: `teamsever-backend/src/services/workspaceCalendar.ts`
- Test: `teamsever-backend/src/__tests__/leaveRequestExpiry.test.ts`
- Modify: `teamsever-backend/src/__tests__/leaveApprovalFlow.test.ts`

**Interfaces:**
- `workspaceCalendarDateKey(date: Date, timezone: string): string` returns the current `YYYY-MM-DD` in the validated IANA zone.
- `expirePendingRequests(workspaceId: string, now?: Date): Promise<number>` atomically marks only pending leave/remote requests expired when `endDate`’s canonical calendar date is on or before the workspace-local current date.
- Add authenticated `/my-requests` and assigned `/inbox` read routes so members can see their own history and authorized reviewers can see actionable requests without requiring team-wide history permission.

- [ ] **Step 1: Write failing tests** for Kathmandu midnight, UTC fallback, DST boundary, leave+remote expiry, approved/denied preservation, queue filtering, stale approve/deny rejection, and concurrent decision safety.
- [ ] **Step 2: Run focused backend tests** and confirm expected failures before implementation.
- [ ] **Step 3: Add `expired` status and calendar helper**; store canonical request date from the UTC date portion already sent by clients.
- [ ] **Step 4: Implement idempotent atomic expiry** before list and decision operations; preserve authorization checks and reject stale actions.
- [ ] **Step 5: Add member-history and assigned-reviewer inbox endpoints** with privacy-safe population and permission tests.
- [ ] **Step 6: Update linked DM metadata and socket events** when requests expire; suppress all decision controls for expired requests.
- [ ] **Step 7: Schedule a periodic sweep** for persisted terminal statuses, while keeping list/decision endpoints correct if the job is delayed.
- [ ] **Step 8: Run focused expiry and approval tests** and backend typecheck.

### Task 3: Web Attendance information architecture

**Files:**
- Modify: `teamsever-frontend/src/components/sidebar/AppSidebar.tsx`
- Modify: `teamsever-frontend/src/app/workspace/[id]/attendance/page.tsx`
- Create: `teamsever-frontend/src/app/workspace/[id]/attendance/[section]/page.tsx`
- Modify or create: focused components under `teamsever-frontend/src/components/attendance/`
- Preserve: `teamsever-frontend/src/app/workspace/[id]/time-tracking/timesheets/page.tsx`
- Tests: focused AppSidebar and attendance navigation tests under `teamsever-frontend/src/components/sidebar/` and `src/app/workspace/[id]/attendance/`

- [ ] **Step 1: Write failing navigation tests** for canonical section URLs, selected state, old attendance/timesheet links, and permission-based visibility.
- [ ] **Step 2: Run the focused tests to verify failure.**
- [ ] **Step 3: Add an Attendance hub shell** with Overview & Clock, Timesheets, Leave & Remote Requests, Presence & Activity, and Locations & Work Modes as distinct stable routes.
- [ ] **Step 4: Move existing page components into the correct sections** without duplicating clock, presence, or location state; preserve legacy timesheet route behavior.
- [ ] **Step 5: Run focused navigation tests and frontend typecheck.**

### Task 4: Web leave request history and expiry display

**Files:**
- Modify: `teamsever-frontend/src/components/attendance/LeaveManagementTab.tsx`
- Modify: `teamsever-frontend/src/components/chat/LeaveCard.tsx`
- Modify: relevant shared leave status types and request views under `teamsever-frontend/src/`
- Tests: `teamsever-frontend/src/components/attendance/LeaveManagementTab.spec.tsx` and relevant leave-card tests

- [ ] **Step 1: Write failing tests** for Expired history badge, exclusion from pending queues, and removal of approve/deny actions on stale cards.
- [ ] **Step 2: Run the tests to verify failure.**
- [ ] **Step 3: Fetch personal history, assigned inbox, and authorized team history** from the correct endpoint for each view.
- [ ] **Step 4: Render Expired as history-only status** and keep pending/approved/denied behavior unchanged.
- [ ] **Step 5: Run focused tests and frontend typecheck.**

### Task 5: Flutter Attendance hub and request workflows

**Files:**
- Modify: `TeamsEver/lib/features/attendance/presentation/pages/attendance_screen.dart`
- Create: `TeamsEver/lib/features/attendance/presentation/pages/attendance_hub_screen.dart` or equivalent section host
- Create: `TeamsEver/lib/features/attendance/presentation/pages/leave_requests_screen.dart`
- Create: `TeamsEver/lib/features/attendance/presentation/pages/desktop_presence_screen.dart`
- Reuse: `TeamsEver/lib/features/attendance/presentation/pages/attendance_locations_screen.dart`
- Modify: `TeamsEver/lib/features/chat/presentation/widgets/leave_remote_request_widgets.dart`
- Add models/data source/repository/use cases under `TeamsEver/lib/features/attendance/` for member history, assigned inbox, and desktop timeline.
- Tests: `TeamsEver/test/features/attendance/attendance_hub_test.dart`, request status widget/API tests, and presence screen tests.

- [ ] **Step 1: Write failing Flutter tests** for section navigation, Expired rendering without actions, pending review actions, and explicit “Desktop presence unavailable” state when no desktop data exists.
- [ ] **Step 2: Run focused Flutter tests to verify failure.**
- [ ] **Step 3: Make the existing Attendance bottom-nav entry a hub** with native section navigation while reusing existing attendance report/clock and locations flows.
- [ ] **Step 4: Implement personal leave history and authorized reviewer inbox** using backend routes; preserve private A→B request rules and existing DM cards.
- [ ] **Step 5: Implement read-only desktop presence timeline** with app intervals, AFK/gap states, and honest no-reporter messaging; do not sample mobile foreground activity.
- [ ] **Step 6: Run Flutter tests and `flutter analyze`.**

### Task 6: Integrated verification and release readiness

**Files:**
- All files from Tasks 1–5.
- Add or update release notes only if the repositories’ existing release process requires them.

- [ ] **Step 1: Run backend full Jest suite and TypeScript check.**
- [ ] **Step 2: Run frontend full Vitest suite, TypeScript check, and production build.**
- [ ] **Step 3: Run Flutter full test suite, `flutter analyze`, and Windows target build from `D:\Windows_Projects\TeamsEver` where the installed toolchain permits.**
- [ ] **Step 4: Review final diffs in all three repositories and verify unrelated pre-existing changes are excluded.**
- [ ] **Step 5: Push/merge to `main` only if all checks pass and deployment/release targets are confirmed; otherwise leave changes unpushed and report the exact blocker.**
