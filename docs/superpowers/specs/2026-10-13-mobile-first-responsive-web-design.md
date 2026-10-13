# Mobile-First Responsive Web Experience

## Outcome

Make the TeamsEver web application comfortable and complete to use on phones, with the compact, direct feel of a mobile app. Desktop layouts remain the reference experience for larger screens and keep their existing behavior.

## Who this is for

Workspace members and administrators using TeamsEver from a phone browser. They must be able to reach the same core work, attendance, messaging, quality, and account features as desktop users without needing a large monitor or horizontal page scrolling.

## Current context

The app has around fifty App Router pages spanning public and authentication pages, workspace dashboard and analytics, spaces and task lists, chat and inbox, documents and files, attendance and time tracking, QA, settings, and super-admin. The shared desktop shell in `ClientLayout` currently renders the global header and sidebar, while a mobile workspace tab bar exists but is rendered only by the analytics page. Some sections already use mobile-specific components, while other pages contain wide tables, dense dashboards, and fixed-width controls. The responsive work must be consistent across shared shell and page families rather than isolated to the QA reports screen.

## Design choices

Three implementation shapes were considered:

1. Apply broad CSS-only overrides. This is quick, but many pages need structural changes for cards, action placement, and navigation, so CSS alone risks clipped or hard-to-use controls.
2. Build a shared mobile shell and a small set of reusable responsive patterns, then adapt each page family where its content requires it. This reuses current desktop flows, limits duplication, and is the recommended approach.
3. Build a separate mobile application interface. This offers maximum freedom but duplicates routing and behavior and raises the cost of keeping web and mobile features in sync.

## Experience design

### Navigation and app shell

- At phone widths, use a compact header with clear access to workspace identity, search, notifications, and profile/menu actions.
- Provide persistent bottom navigation for the primary workspace destinations. It must work consistently on all workspace routes, show the current destination, respect safe-area insets, and leave enough bottom padding so page actions and content are not covered.
- Keep less frequent destinations (including QA, documents, files, activity, and settings) reachable from a clearly labeled More/menu surface. The menu must preserve workspace context and expose profile access.
- Use the current sidebar as the source for complete navigation and workspace switching; do not create a second, divergent destination list.
- Keep authentication, public, and super-admin routes usable on mobile without adding workspace-only navigation to them.

### Page layout and content patterns

- Use a single-column content layout on narrow screens, with compact headings, readable spacing, and controls that use the available width.
- Convert wide data tables into readable stacked rows/cards on phones when the page has meaningful row actions or multiple data fields. Retain the desktop table at larger widths. Where horizontal scrolling is the right interaction (for example, spreadsheet-like task tables), keep it within a clearly bounded container and never make the whole page scroll sideways.
- Reflow dashboards, charts, filters, analytics, timesheets, and QA summaries into a clear vertical order. Preserve the information and actions available on desktop.
- Keep forms single-column on phones, provide full-width inputs and deliberate action placement, and avoid dialogs taller than the viewport. Use a full-width or near-full-width sheet/dialog where complex map or multi-step content needs room; support internal scrolling and safe areas.
- Keep maps usable on small screens, with a deliberate expand/full-screen affordance when precision matters.
- Keep chat and inbox reading and composing usable above the on-screen keyboard, with touch-accessible attachment and action controls.
- Preserve the existing application color themes and visual identity while tightening mobile hierarchy, typography, spacing, and tap targets.

### Responsive behavior and accessibility

- Treat 320–767 CSS pixels as the phone layout, 768–1023 as compact/tablet layout, and 1024+ as the desktop layout, aligning with the existing Tailwind `lg` shell breakpoint unless implementation evidence requires a shared breakpoint adjustment.
- Support safe-area insets, device text scaling, keyboard focus, visible focus states, semantic labels, and at least 44×44 CSS-pixel primary touch targets where practical.
- Avoid fixed viewport heights that trap content; use dynamic viewport sizing for full-screen mobile surfaces and allow page content to scroll naturally.
- Do not hide a feature solely because the user is on mobile. If an interaction cannot be represented inline, expose it through an accessible menu, sheet, or detail view.

## Scope

In scope: all public/authentication, workspace, workspace settings, attendance, time-tracking, analytics, chat/inbox, QA, documents/files, and super-admin pages and shared navigation, including loading, empty, error, and modal/drawer states that materially affect phone use.

Out of scope: changing business rules, API contracts, role permissions, desktop-specific redesign, or turning the web app into a separate native application. Existing desktop styles may be adjusted only where a shared responsive fix requires it, and desktop behavior must remain intact.

## Validation and acceptance

- Check representative screens from every page family at 320, 360, 390, and 430 CSS-pixel widths, plus compact/tablet and desktop widths.
- No page-level horizontal overflow at phone widths except intentionally bounded horizontal data surfaces; all such surfaces must be operable and visually signposted.
- Core workspace routes and less frequent routes remain reachable through mobile navigation, including profile, QA, and attendance.
- Tables, filters, forms, dialogs, maps, charts, and chat remain readable and their primary actions remain usable without clipping or being covered by navigation or safe areas.
- Empty, loading, error, and long-content states remain usable at phone widths.
- Run the project test suite and a production build, then inspect representative routes in a browser at phone widths before considering the redesign complete.

## Risks and mitigations

- The breadth of routes can leave an isolated screen overlooked. Mitigate with a route-family inventory and repeatable viewport review checklist.
- Some wide, interactive data surfaces cannot become ordinary cards without losing useful behavior. Keep those in bounded horizontal scrollers with persistent row context, and convert simpler tables to cards.
- A shared bottom bar can obscure content or compete with page-level controls. Reserve safe-area-aware bottom space and test scrolling, dialogs, and keyboard-open states.
- Mobile and desktop may share components with implicit layout assumptions. Prefer responsive variants and targeted structural changes, and verify desktop screenshots/routes after each family is adapted.
