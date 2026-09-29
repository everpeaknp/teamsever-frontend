# Web Attendance Location Design

## Goal

Add workspace-managed location rules to Teamsever's existing web clock-in flow. Members can clock in only when the browser's location reading matches an office area or a remote area assigned to that member. While clocked in, the web app periodically reports location-check status while it remains open. Missing or invalid updates create a visible review flag and never silently clock the member out or alter recorded time.

## Scope and sequence

This spec covers the first, web-only phase. The current Next.js frontend and Express/Mongoose backend remain the product surfaces. Electron packaging, foreground-app detection, browser-tab or IDE details, and background location after the browser closes are later work and are not prerequisites for this phase.

The existing clock control is in `src/components/analytics/ClockInOut.tsx`. It calls `POST /api/workspaces/:id/clock/toggle`; the backend handler is currently `toggleWorkspaceClock` in `src/controllers/workspaceMemberController.ts`. The feature extends this flow rather than adding a second clock system.

## Workspace configuration and authority

Add an attendance-location policy to each workspace. It has a setup state and an enforcement state. Existing workspaces remain unenforced until an authorized manager has configured at least one office area and enabled enforcement. Once enforcement is enabled, the backend rejects clock-in if required location data or a valid assignment is missing; it must never fall back to the old location-free path.

An attendance area has a stable ID, display name, kind (`office` or `remote`), center coordinates, and radius in meters. A member has an assigned work mode (`onsite` or `remote`). On-site members may clock in at configured office areas. Remote members may clock in only at remote areas assigned to that member; a member may have multiple assigned remote areas. Members cannot grant themselves an area or change their assigned mode.

Add `MANAGE_ATTENDANCE_LOCATIONS` as a workspace permission for creating, editing, disabling, and assigning areas or modes. Workspace owners and admins receive this authority by default; other managers receive it only through the existing workspace permission system. Every management operation is scoped to the workspace in the URL and verifies the actor is an active member with the effective permission.

## Clock-in and location-check flow

When a member clocks in, the frontend requests a fresh browser geolocation reading over HTTPS and submits latitude, longitude, reported accuracy, and capture time with the existing toggle request. The backend independently validates the authenticated member, workspace policy, assigned mode, area assignment, coordinate ranges, timestamp freshness, accuracy threshold, and distance to an eligible area. Client-side checks may explain errors early but never authorize a clock-in.

The initial implementation uses a workspace-configurable geofence radius (default 150 m) and maximum accepted reported accuracy (default 100 m). The measured point must be within the eligible area's radius and the reported accuracy must be at or below the configured maximum. Clock-out does not require location. Clock-in requests must not create duplicate running time entries; status and time-entry changes must leave a consistent result if either write fails.

After successful clock-in, while the attendance page is open, the frontend watches for location changes and sends a check at least once per minute, using a fresh reading no older than two minutes. The backend stores check events as `inside`, `outside`, or `unavailable`. If the reading is outside all eligible areas, accuracy is unacceptable, permission is revoked, or updates are absent for more than two minutes, Teamsever shows the member a clear status and creates a review flag visible to authorized managers. A recovered valid reading clears the active flag while preserving its history. These events do not clock out the member, change the time entry, or imply misconduct.

If the browser is closed, suspended, offline, or location access is denied, continuous checking cannot be guaranteed by the web app. After the two-minute stale threshold, the state becomes `unavailable`; the clock and recorded time remain unchanged until the member clocks out. The review flag remains visible to the member and authorized location managers, and the app must explain this limitation before location tracking starts.

## Data minimization and interface behavior

Use coordinates only to make each server-side geofence decision. Persist the matched area ID, mode, check time, reported accuracy, decision, and review-flag state; do not persist raw latitude/longitude in the initial release. Preserve check-event history with attendance records so reviewers can understand when checks failed and recovered.

The clock-in UI explains why location is requested and presents actionable states for permission denied, location unavailable, stale reading, poor accuracy, outside eligible area, and missing assignment. Do not optimistically show a successful clock-in before the backend accepts it. The attendance view shows active location-check status and review flags to the member and authorized attendance managers, without exposing precise coordinates.

The location settings UI supports creating and disabling areas, selecting a point on a map or entering coordinates, setting the radius, assigning member mode, assigning multiple remote areas, and enabling enforcement only after valid configuration. Changes are workspace-scoped and auditable.

## Backend invariants and failure handling

- Only the server decides whether a member can clock in under an enforced policy.
- The clock-in request is rejected if location is absent, malformed, stale, too inaccurate, or outside the member's eligible areas.
- Clock-out remains possible if the location service is unavailable.
- A failed or missing active-session location check creates a review flag; it never silently changes clock status or time records.
- Duplicate and concurrent clock-in/out requests cannot create multiple running time entries or desynchronize member status from the running entry.
- Location management and review data are isolated by workspace and permission-checked on every request.
- If a workspace policy is not enabled, existing clock-in behavior remains unchanged until an administrator completes setup and explicitly enables enforcement.

## Verification criteria

Backend tests cover eligible office and remote clock-ins, multiple remote assignments, unassigned areas, wrong workspace, missing or invalid coordinates, stale timestamps, poor accuracy, boundary decisions, disabled versus enforced policy, unauthorized area changes, clock-out without location, duplicate/concurrent transitions, and location-check transitions from inside to outside/unavailable and back to inside.

Frontend tests cover geolocation permission and error states, no optimistic success on rejected requests, clear clock-in and clock-out behavior, active status while checks are missing, and review-flag visibility by role. Production builds and existing attendance/chat tests must pass.

## Known limits

Browser geolocation requires HTTPS and user permission. Location values originate from the member's device and can be spoofed by a determined user; backend geofencing prevents ordinary client-side bypasses but is not proof against device-level location spoofing. The web phase cannot keep checking location after its page is closed or suspended. Those limits must be clear in product copy and remain true regardless of the Electron phase.
