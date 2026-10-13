# Mobile-First Responsive Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all TeamsEver web routes usable and polished on phone screens while preserving desktop behavior.

**Architecture:** Add a consistent phone navigation shell and safe-area-aware responsive foundation, then adapt existing route families with focused mobile layouts. Reuse existing flows and shared components; use card presentations for ordinary data tables and bounded horizontal scrolling only for spreadsheet-like interfaces.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, Vitest/Testing Library, existing Radix UI components.

**Spec:** `docs/superpowers/specs/2026-10-13-mobile-first-responsive-web-design.md`

## Global Constraints

- Phone layout: 320–767 CSS px; compact/tablet: 768–1023 CSS px; desktop: 1024+ CSS px.
- Do not change business rules, API contracts, permissions, or feature availability.
- Preserve desktop behavior and verify it after shared-component changes.
- Use safe-area insets and reserve content space for persistent mobile navigation.
- Primary touch targets should be at least 44×44 CSS px where practical.
- No page-level horizontal overflow on phones; intentional data scrollers stay locally bounded.

## Review Focus

- At 320 px, long labels, translations, and large text must wrap without clipping or page overflow.
- Keyboard-open chat, search, and form states must keep the active field and primary action reachable.
- Bottom navigation and dialogs must respect device safe areas and never cover the last content or action.
- Tables with row actions must keep the row identity and its actions together when converted to cards or scrollers.
- Loading, empty, and error states must remain navigable and readable at phone widths.

---

### Task 1: Shared Mobile Shell and Responsive Foundation

**Files:**
- Modify: `src/components/layout/ClientLayout.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/layout/MobileWorkspaceTabBar.tsx`
- Modify: `src/components/sidebar/MobileSidebar.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/layout/ClientLayout.mobile.spec.tsx` (create)
- Test: `src/components/layout/MobileWorkspaceTabBar.spec.tsx`

- [ ] Add a failing shell test covering mobile workspace navigation, current route state, and public/auth route exclusion.
- [ ] Run the focused test and confirm it fails because the shared shell does not yet provide consistent mobile navigation.
- [ ] Implement the shared compact header, persistent primary tabs, and a complete More/menu destination surface sourced from existing sidebar navigation.
- [ ] Add safe-area-aware page bottom spacing and responsive global overflow safeguards without changing desktop shell behavior.
- [ ] Run shell tests and inspect workspace, auth, and desktop shell at phone, tablet, and desktop widths.

### Task 2: Public, Authentication, and Account Routes

**Files:**
- Modify: `src/app/page.tsx`, `src/app/pricing/page.tsx`, `src/app/plans/page.tsx`, `src/app/support/page.tsx`, `src/app/privacy-policy/page.tsx`, `src/app/terms-and-conditions/page.tsx`
- Modify: `src/app/login/page.tsx`, `src/app/register/page.tsx`, `src/app/join/page.tsx`, `src/app/auth/forgot-password/page.tsx`, `src/app/auth/reset-password/page.tsx`, `src/app/account/page.tsx`, `src/app/delete-account/page.tsx`
- Modify: `src/app/payment/success/page.tsx`, `src/app/payment/failure/page.tsx`
- Test: add responsive component tests alongside any page-specific forms that need structural changes.

- [ ] Identify the page-level responsive regressions through a route and viewport checklist before edits.
- [ ] Add/adjust failing interaction tests for any mobile-specific navigation or form behavior introduced in this group.
- [ ] Reflow headers, cards, pricing comparisons, legal text, forms, and payment outcomes to fit narrow widths with readable action hierarchy.
- [ ] Verify keyboard, validation, loading, and success/error states on phones and confirm desktop layouts remain intact.

### Task 3: Workspace Dashboard, Analytics, Spaces, and Task Views

**Files:**
- Modify: `src/app/workspace/[id]/page.tsx`, `src/app/workspace/[id]/analytics/page.tsx`
- Modify: `src/app/workspace/[id]/analytics/team-performance/page.tsx`, `src/app/workspace/[id]/analytics/team-performance/[userId]/page.tsx`
- Modify: `src/app/workspace/[id]/spaces/[spaceId]/page.tsx`, `src/app/workspace/[id]/spaces/[spaceId]/folders/[folderId]/page.tsx`, `src/app/workspace/[id]/spaces/[spaceId]/lists/[listId]/page.tsx`
- Modify: `src/components/analytics/*.tsx`, `src/components/space/*.tsx`, `src/components/list-view/*.tsx`, `src/components/kanban/*.tsx`, `src/components/tables/CustomTableView.tsx`
- Test: component tests for responsive dashboard cards, task rows, and table/card behavior in affected components.

- [ ] Add failing behavior tests for access to key dashboard and task actions at mobile layout, plus table row action retention where structure changes.
- [ ] Run focused tests and confirm the expected missing mobile behavior.
- [ ] Stack dashboard metrics and charts, reflow analytics filters, and make team-performance records readable without page-level horizontal scrolling.
- [ ] Preserve task operations across list, kanban, and spreadsheet-like views; use compact cards or bounded scrollers according to the spec.
- [ ] Verify representative long titles, empty spaces, large task counts, and 320/390/430 px widths, plus desktop.

### Task 4: Chat, Inbox, Documents, Files, and Notifications

**Files:**
- Modify: `src/app/workspace/[id]/chat/page.tsx`, `src/app/workspace/[id]/inbox/page.tsx`, `src/app/workspace/[id]/notifications/page.tsx`, `src/app/notifications/page.tsx`
- Modify: `src/app/workspace/[id]/docs/page.tsx`, `src/app/workspace/[id]/docs/[docId]/page.tsx`, `src/app/workspace/[id]/files/page.tsx`
- Modify: `src/components/chat/*.tsx`, `src/components/docs/Editor.tsx`, `src/components/notifications/NotificationBell.tsx`, `src/components/search/*.tsx`
- Test: `src/components/chat/LeaveCard.test.tsx`, relevant chat/request tests, and new mobile interaction tests as needed.

- [ ] Add failing tests for mobile conversation navigation and composer/action reachability when those interactions change.
- [ ] Run focused tests and verify they fail for the missing responsive behavior.
- [ ] Make conversation lists, message detail, composer, notification lists, document controls, and file actions work in a narrow single-column flow.
- [ ] Handle keyboard-open and attachment/menu surfaces without hiding the composer or active content.
- [ ] Verify empty/loading/error states and long messages at phone widths, and check desktop split-pane behavior.

### Task 5: Attendance, Time Tracking, and Location Workflows

**Files:**
- Modify: `src/app/workspace/[id]/attendance/page.tsx`, `src/app/workspace/[id]/attendance/[section]/page.tsx`
- Modify: `src/app/workspace/[id]/time-tracking/page.tsx`, `src/app/workspace/[id]/time-tracking/timesheets/page.tsx`
- Modify: `src/components/attendance/*.tsx`, `src/components/analytics/ClockInOut.tsx`, `src/components/analytics/AttendanceReport.tsx`, `src/components/analytics/AttendanceRecordsView.tsx`, `src/components/modals/PublicClockPresence.tsx`, `src/components/chat/RequestLeaveModal.tsx`, `src/components/chat/RemoteLocationMap.tsx`
- Test: existing attendance, location, live timer, leave request, and public clock tests; add responsive interaction tests for map expansion and admin clock-out reason flow if component structure changes.

- [ ] Add failing tests for mobile-critical interactions that are not already covered, including expanded map close/return behavior.
- [ ] Run focused tests and confirm failure before implementation.
- [ ] Reflow attendance summaries, active clocked-in status, timesheet rows, location review, and leave/remote forms for phone screens.
- [ ] Add a phone-usable expanded map surface while preserving pin selection, current location, and existing validation behavior.
- [ ] Verify location details, long member lists, admin actions, safe areas, and desktop table/map behavior.

### Task 6: QA Cases, Plans, Runs, Bugs, and Reports

**Files:**
- Modify: `src/app/workspace/[id]/quality/page.tsx`, `src/app/workspace/[id]/quality/cases/page.tsx`, `src/app/workspace/[id]/quality/plans/page.tsx`, `src/app/workspace/[id]/quality/runs/[runId]/page.tsx`, `src/app/workspace/[id]/quality/bugs/page.tsx`, `src/app/workspace/[id]/quality/reports/page.tsx`, `src/app/workspace/[id]/quality/settings/page.tsx`, `src/app/workspace/[id]/quality/guide/page.tsx`
- Modify: `src/components/quality/*.tsx`
- Test: all existing `src/components/quality/*.test.tsx` and responsive report/run navigation coverage.

- [ ] Add failing tests for narrow-screen case/plan actions, execution step editing, and report result navigation where current behavior is not covered.
- [ ] Run focused tests and confirm expected failures.
- [ ] Reflow QA summaries, editors, bug rows, execution forms, guide navigation, and reports into mobile card/detail patterns while preserving case and run actions.
- [ ] Keep report signing, exports, linked bugs, and all result details reachable on phones.
- [ ] Verify long case titles, evidence controls, blocked gates, and report snapshots at phone widths and desktop.

### Task 7: Settings, Workspace Administration, Super-Admin, and Shared Overlays

**Files:**
- Modify: `src/app/workspace/[id]/settings/page.tsx`, `src/app/workspace/[id]/settings/members/page.tsx`, `src/app/workspace/[id]/settings/permissions/page.tsx`, `src/app/workspace/[id]/settings/roles/page.tsx`, `src/app/workspace/[id]/settings/feedback/page.tsx`, `src/app/workspace/[id]/activity-log/page.tsx`
- Modify: `src/app/super-admin/page.tsx`, `src/app/super-admin-login/page.tsx`, `src/app/super-admin/plans/create/page.tsx`, `src/app/super-admin/plans/edit/[id]/page.tsx`
- Modify: `src/components/super-admin/*.tsx`, `src/components/modals/*.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`
- Test: existing modal/super-admin tests and new tests for dialog sizing, action visibility, and profile access.

- [ ] Add failing tests for key mobile settings navigation, profile access from the mobile menu, and long-dialog action reachability.
- [ ] Run focused tests and confirm failures represent the missing behavior.
- [ ] Reflow settings, member and role controls, activity records, and super-admin tables/forms for phone use.
- [ ] Establish consistent full-width or near-full-width mobile sheets for complex forms, with internal scroll, visible actions, and safe-area spacing.
- [ ] Verify role-dependent controls, long settings forms, profile navigation, and desktop dialog behavior.

### Task 8: Whole-Site Responsive Audit and Release Verification

**Files:**
- Modify: any route-family files found by the responsive audit.
- Test: complete Vitest suite and production build; document route/viewport checks in the plan review.

- [ ] Inspect every route family at 320, 360, 390, and 430 px and representative tablet/desktop widths; record overflow, clipping, covered actions, and inaccessible routes.
- [ ] Add focused regression tests for each discovered bug, observe the failures, then fix and re-run them.
- [ ] Re-check loading, empty, error, long-content, modal, keyboard-open, and safe-area states across affected families.
- [ ] Run `npm test` and `npm run build` and resolve regressions.
- [ ] Confirm there is no page-level horizontal overflow on phones, navigation remains complete, and desktop routes still render as expected.
