# Attendance Workspace and Leave Expiry Design

## Goal

Make attendance-related tools easy to find and understand without combining unrelated workflows into one long page. Ensure pending leave and remote-work requests stop being actionable at the approved end-date cutoff.

## Current state

- The workspace has an `Attendance & Leaves` page with tabs for clocks/attendance, leave records, desktop presence, and location settings.
- Timesheets also have a separate workspace route, which splits related work across navigation surfaces.
- The backend leave request model supports `pending`, `approved`, and `denied`, but has no terminal expired state.
- Pending leave and remote requests can remain in review queues after their end date; decision paths check status but not request-date expiry.
- Profile identity and preferences are account-level concerns, while attendance policies and assignments are workspace concerns.
- The Workspace model has no timezone field. Workspace General Settings already provides an owner/manager-authorized place to manage shared workspace configuration.

## Workspace navigation

Create one `Attendance` parent in workspace navigation with separate, deep-linkable sections:

1. **Overview & Clock** — personal clock action and current attendance summary; managers may see a concise team-today summary.
2. **Timesheets** — clock records, date range, and timesheet review/export flows already provided by the product.
3. **Leave & Remote Requests** — a personal request view, manager approval queue, and searchable history with clear status filters.
4. **Presence & Activity** — desktop presence timeline, tracking gaps, app intervals, AFK policy, and monitoring controls according to the viewer’s permissions.
5. **Locations & Work Modes** — office geofences, member work-mode assignments, remote areas, and location enforcement policy for authorized managers.

Each section receives a stable URL and a shared attendance page shell with a title, current-section indicator, and breadcrumb. Permission checks hide or disable management-only sections without hiding the member’s own attendance and request history. Existing workspace links should redirect to or resolve through the canonical sections so saved links continue to work.

## Profile boundary

Keep the account profile under the user/account area. It owns identity and personal preferences. Workspace attendance policy, team locations, and approval settings remain under Attendance. Where a personal profile setting affects attendance, show an explanatory link to the relevant Attendance section instead of duplicating the setting.

Store the workspace’s IANA timezone in workspace settings, editable by users with `MANAGE_SETTINGS`. The General Settings page displays and saves it. Existing workspaces without a value use UTC until an authorized manager configures their actual timezone; show that fallback clearly so administrators know why configuration matters.

## Leave and remote request lifecycle

Extend request status with `expired`. A request is expired once the workspace-local calendar date reaches its `endDate` date. Leave dates are submitted by the current form as UTC-midnight date values, so retain the UTC date portion as the requested calendar date, then compare it with the current date in the configured workspace timezone. Thus a request from Oct 1 through Oct 2 leaves pending queues at the beginning of Oct 2 in the workspace timezone. Apply the same policy to `leave` and `remote` requests.

- Expired requests are excluded from pending approval queues and active remote request lists.
- They remain available in history with an `Expired` status and their original dates/reason for audit.
- Approve and deny operations must reject an expired request, even if a stale client submits the action.
- Expiry must be race-safe with approval/denial so only one terminal transition wins.
- The policy uses the configured workspace IANA timezone, never each reviewer’s browser timezone; missing legacy settings consistently fall back to UTC.
- Existing approved/denied decisions remain unchanged. Expiry only transitions requests still pending.
- DM request cards and notifications should reflect expiry using existing update mechanisms where practical, without revealing private remote-area data beyond the requester and authorized reviewer.

The backend is authoritative for expiry. Listing and decision endpoints must behave correctly even if a scheduled task is delayed. A periodic backend job persists expired statuses for requests not otherwise read; it is idempotent and operates only on pending requests. Both old and new clients consume the resulting status.

## Data and API compatibility

- Add `expired` to the LeaveRequest status enum and client types.
- Preserve existing route payload shapes and include `expired` in historical results.
- Pending-only queue endpoints must omit expired items.
- Remote approval must not create a remote-area approval after expiry.
- Keep request privacy and the existing assigned-approver/owner authorization rules unchanged.

## Validation

- Backend tests cover workspace-timezone date-boundary behavior (including UTC fallback and a daylight-saving transition), both leave and remote queue filtering, stale approve/deny rejection, concurrent decision safety, and idempotent expiration.
- Frontend tests cover Attendance navigation, stable selected sections, permission-aware visibility, and rendering/filtering the `Expired` status.
- Run relevant frontend and backend typechecks, focused tests, and full test suites. Perform a production build for the frontend if the repo environment supports it.

## Out of scope

- Reworking mobile/Flutter navigation in this change; the mobile client should continue to use the shared backend status contract and can be audited separately if its source is brought into scope.
- Changing attendance calculations, clock event history, device pairing, presence collection, or location rules.
- Moving personal identity fields into the workspace Attendance area.
