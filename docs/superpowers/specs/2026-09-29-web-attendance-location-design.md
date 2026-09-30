# Web Attendance Location Design

## Goal

Enforce location-aware web clock-in/out with one fixed workspace office, private member-specific remote places, approved date-bound remote exceptions, and a useful audit trail in the existing Attendance Report. All geofence authorization is server-side. Missing location updates during an active shift become visible review events; they do not rewrite time or silently clock anyone out.

## Location model and permissions

Each workspace has exactly one fixed office geofence. On-site members normally clock in only within 60 m of it. Each member has zero or more private remote geofences, stored on that member rather than in a workspace-wide catalog. Only the member and authorized address managers can view exact remote coordinates. Authorized managers can create/edit/deactivate a member's private areas in that member's settings. Remote members can clock in only inside one of their own active areas. A remote request that proposes a new address keeps its coordinates visible only to the requester and the one assigned approver until approved.

Use `MANAGE_LEAVES_AND_REMOTE` for leave and temporary-remote approval and `MANAGE_ADDRESSES` for office/member address administration. The workspace owner always retains override authority. Existing `MANAGE_LEAVES` and `MANAGE_ATTENDANCE_LOCATIONS` grants must remain backward-compatible during migration; permission catalog labels must expose the new permissions in role templates and member overrides. Address administration is independently checked and does not itself grant leave/remote approval authority.

## Temporary remote request

The existing DM action offers Leave or Remote. A Remote request captures start/end dates, reason, assigned approver, and either a selected already-approved private area or a proposed private address. An On-site member's baseline mode is unchanged. If a new address is proposed, approval atomically approves that private area and the date-bound remote entitlement. A request is not approvable by another manager merely because they have the same permission; only its assigned approver or the workspace owner can decide it. Reject/deny leaves both the baseline mode and approved areas unchanged. A remote request without an address is rejected. Leave behavior remains intact.

During the approved date range, an On-site member may clock in at the selected approved private area; otherwise the office remains their only allowed area. Permanently remote members use their own areas without requiring a temporary request. Expired temporary approvals stop authorizing remote clock-in automatically.

## Clock transitions and stored audit data

Clock-in requires a fresh, accurate browser location when enforcement is enabled. The backend resolves the effective work mode and eligible area (fixed office, private remote area, or date-bound approved exception), rejects unauthorized/out-of-radius points, and records the clock-in point and matched area on the time entry. Clock-out submits a fresh fix. If it is within 60 m of the exact clock-in point, clock-out succeeds normally. If the fix is missing or farther away, clock-out still succeeds so workers cannot become trapped clocked in, and the entry receives a review warning with the observed clock-out point when available. No failed location reading may silently alter recorded times.

During a shift, periodic checks continue while the web page is active. Outside, unavailable, or stale checks create review events and visible status. Recovery clears the active flag while retaining event history. Raw coordinates are stored only for the shift's clock-in and clock-out endpoints to satisfy the report/audit requirement; intermediate periodic events store area/decision/accuracy but no raw point. This is a deliberate exception to the prior data-minimization draft. Access to endpoint coordinates in reports is restricted to the member, workspace owner, and authorized address/attendance managers. Existing historical entries remain without fabricated coordinates.

## Existing UI and report

Replace the global remote area catalog/checkbox assignment UI with a single-office editor and per-member remote area map picker. Include quick-add at the current location, map center selection, radius control, member search, and clear private-address labeling. Members may see their own approved area names/status, while only authorized managers see coordinates of other members.

Extend the existing Attendance Report rows with clock-in location and clock-out location (name, coordinates/map link where authorized, timestamp, and distance/status), effective mode, and mismatch/review warning. CSV and Excel exports include the same audit fields. Historical rows display “Location not recorded” where data does not exist.

## Security and invariants

- All routes scope workspace and member IDs together; every mutation checks active membership and effective permission on the server.
- Remote addresses are never shared across members and are omitted from unauthorized API responses, sockets, notifications, and DM card data.
- Only owner or the exact assigned approver can decide a remote request; owner override is explicit.
- A temporary remote approval is date-bounded and bound to one approved private area.
- The fixed office cannot be duplicated, and the on-site geofence default is 60 m.
- Clock-out remains possible without a valid location and flags the record for review.
- Existing workspaces stay in setup/un-enforced state until configured; there is no location-free bypass after enforcement is enabled.
- Missing updates create `unavailable` review state and never change the shift's times/status.

## Verification

Backend tests cover per-member isolation, permission boundaries, owner/assigned-approver decisions, date bounds, private address approval, geofence boundaries, clock-out within/outside/missing GPS, coordinate privacy, report fields, exports, and stale/unavailable event handling. Frontend tests cover map selection/quick-add per member, leave/remote action selection, proposed-address privacy in the requester/approver DM, role-based settings, and location fields/warnings in report. Run targeted tests and both repository builds; record known unrelated failures without attributing them to this change.

## Limits

Web geolocation requires HTTPS and user permission. Browser checks stop when suspended/closed/offline; after the stale threshold this is shown as unavailable and flagged for review. Device GPS can be spoofed. Electron/background activity monitoring remains a later phase.
