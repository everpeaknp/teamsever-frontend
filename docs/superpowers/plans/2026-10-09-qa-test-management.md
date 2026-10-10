# TeamsEver QA and Test Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a connected QA workflow from reusable case through build-specific execution, developer bug, retest, and release report across backend, web, and mobile.

**Architecture:** Bugs extend the existing Task work item and stay in space/list boards. Versioned cases, plans, runs, executions, and report snapshots live in a workspace-scoped Quality subsystem. The web app owns the dense library and reporting UX; Flutter owns quick bug reporting and focused execution. All links and transitions are enforced by backend permissions.

**Tech Stack:** TypeScript/Express/Mongoose/Jest backend; Next.js/React/Vitest web; Flutter/Dart mobile; existing signed file storage and notification infrastructure; existing ExcelJS for spreadsheet import; printable snapshot view for browser PDF export.

**Spec:** [QA and Test Management Design](../specs/2026-10-09-qa-test-management-design.md)

## Global Constraints

- Work spans three separate repositories under `/home/ramon/projects/everacy/`: `teamsever-backend`, `teamsever-frontend`, and `TeamsEver`. Commit each repository separately; do not include existing unrelated working-tree changes.
- Existing tasks and their URLs/boards keep working; missing `workItemType` means `task` until backfilled. Ordinary task Done approval is unchanged.
- QA data and links are scoped to one workspace. Validate scope and permissions on the server, including linked files and cross-object IDs.
- Case revisions and finalized report snapshots are immutable. Execution results retain the revision tested and append an audit record for corrections.
- QA grid changes must have visible save/error/conflict states. Use server pagination; do not fetch the entire case or execution collection into a browser table.
- Existing task quotas must not silently prevent a permitted QA member from reporting a bug. Exempt bug creation from the task quota initially and add a workspace rate limit/audit; revisit pricing separately.
- All web/mobile text and status labels use the same contract. A bug's board column uses the existing `Task.status`; a case execution result is stored separately.
- Keep migrations additive and deploy backend support before web/mobile clients. Gate new UI by a workspace `qualityEnabled` flag until smoke tests pass.
- New frontend `*.test.*`/`*.spec.*` files match current `.gitignore`; explicitly include them when committing or narrow that ignore rule.

## Review Focus

1. A QA member with base QA role but no explicit list override must see permitted bug creation in the appropriate scope; a user without workspace/list access must receive 403. Pin in Tasks 1 and 3.
2. An execution cannot link a case, list, bug, or attachment from another workspace; pin in Tasks 5, 8, and 10.
3. Editing or retiring a case after execution does not change the recorded steps or old report; pin in Tasks 5 and 11.
4. Double-clicking “Create bug” or retrying after a timeout does not create duplicate bugs; pin in Task 10.
5. Concurrent grid edits and CSV import errors preserve the user's input and report affected rows; pin in Tasks 6 and 7.

## File map and interfaces

### Backend (`../teamsever-backend`)

- Extend `src/models/Task.ts`, `src/validators/taskValidators.ts`, `src/services/taskService.ts`, and `src/routes/taskRoutes.ts` for `workItemType`, bug details, and transition validation. Add `src/services/bugWorkflowService.ts` for the single server-authoritative bug transition path.
- Extend `src/permissions/permission.constants.ts` and `src/permissions/permission.service.ts` with granular QA grants; use existing scoped-access middleware conventions.
- Add `src/models/QaModule.ts`, `TestSuite.ts`, `TestCase.ts`, `TestCaseRevision.ts`, `TestPlan.ts`, `TestRun.ts`, `TestExecution.ts`, and `QaReportSnapshot.ts`. Each has `workspace` and indexes for its main paginated queries. `QaModule` and the workspace feature flag ship with bug creation; the remaining models follow in their milestones.
- Add focused `src/services/testCaseService.ts`, `testCaseImportService.ts`, `testRunService.ts`, `qaDefectService.ts`, `qaReportService.ts`; `src/controllers/qaModuleController.ts`, `qaCaseController.ts`, `qaRunController.ts`, `qaReportController.ts`; `src/routes/qaModuleRoutes.ts`, `qaCaseRoutes.ts`, `qaRunRoutes.ts`, `qaReportRoutes.ts`. Mount routes under `/api/workspaces/:workspaceId/quality` in `src/server.ts`.
- Reuse `src/services/attachmentService.ts`, `src/routes/attachmentRoutes.ts`, and `src/services/enhancedNotificationService.ts`; add execution-evidence ownership checks and QA-specific notifications rather than a second storage/notification pipeline.
- Add additive backfill `src/scripts/backfillTaskWorkItemType.ts` and focused Jest integration/service tests in `src/__tests__/`.

### Web (`teamsever-frontend`)

- Add `src/app/workspace/[id]/quality/` routes for Overview, Cases, Plans, Runs, Bugs, Reports, and case/run detail. Add Quality navigation to `src/components/sidebar/AppSidebar.tsx` and the appropriate mobile web navigation entry.
- Add focused components in `src/components/quality/`: `BugForm`, `CaseGrid`, `CaseEditor`, `CaseImportWizard`, `PlanEditor`, `RunGrid`, `ExecutionPlayer`, `ReportView`.
- Add `src/hooks/queries/useQuality.ts` and `src/hooks/mutations/useQualityMutations.ts` with keys scoped by workspace, query filters, and pagination. Extend `src/components/tasks/TaskDetailSidebar.tsx` and the existing list create dialog for bug type/evidence/handoff; do not duplicate task detail state.
- Add behavior tests near the new screens/components; verify permission errors, grid conflicts, and run/result navigation.

### Flutter (`../TeamsEver`)

- Extend `lib/features/tasks/domain/entities/task_entity.dart`, data mapper/model, `create_task_sheet.dart`, and task detail sheet for bug type, guided report, evidence, and handoff state.
- Add `lib/features/quality/` data/domain/presentation for My QA queue, execution detail, step result/evidence, and report summary. Add routes in `lib/core/router/app_router.dart` and tests under `test/features/quality/`.

### Stable API contract

- `POST /api/lists/:listId/tasks` accepts optional `workItemType: "task" | "bug"` (default `task`), `moduleId`, and conditional `bugDetails`. `POST /api/tasks/:id/quality-transition` accepts `action: "start" | "ready_for_qa" | "verify" | "reopen" | "close_without_fix"`, reason, executionId, and idempotency key where relevant.
- Under `/api/workspaces/:workspaceId/quality`: CRUD/list endpoints for `/modules`, `/suites`, `/cases`, `/plans`, `/runs`; `/cases/:id/revisions`; `/cases/import/preview`, `/cases/import/commit`, `/cases/export`; `/runs/:id/executions`; `PATCH /executions/:id`; `POST /executions/:id/bugs`; `/reports/live`, `/reports/snapshots`, and `POST /plans/:id/signoff`.
- All collection responses use `{ data: items, pagination: { page, limit, total } }`. Mutation errors use 400 for invalid input, 403 for missing scope/permission, 404 for unavailable object, and 409 for revision/idempotency conflict.

## Milestone A — a usable bug handoff

### Task 1: Bug type, validation, QA permissions, and migration

**Files:** Backend `src/models/Task.ts`, `src/models/QaModule.ts`, `src/models/Workspace.ts`, `src/validators/taskValidators.ts`, `src/permissions/permission.constants.ts`, `src/permissions/permission.service.ts`, `src/services/taskService.ts`, `src/routes/qaModuleRoutes.ts`, `src/controllers/qaModuleController.ts`, `src/scripts/backfillTaskWorkItemType.ts`; tests `src/__tests__/qaBugCreation.test.ts`.

**Interfaces:** Produces `workItemType`, `moduleId`, `bugDetails` on Task and permission names `VIEW_QUALITY`, `AUTHOR_CASE`, `EXECUTE_CASE`, `MANAGE_PLAN`, `CREATE_BUG`, `TRIAGE_BUG`, `VERIFY_BUG`, `VIEW_QA_REPORT`, `SIGN_OFF_QA`. Existing task creation remains valid.

- [ ] Write failing API tests for legacy Task default, required bug fields, QA create in an accessible list, denial outside scope, and quota behavior. Run `npm test -- --runInBand qaBugCreation`; expect failures tied to missing type/permission.
- [ ] Add schema, module CRUD, `qualityEnabled` flag, validation, scoped permission handling, and additive backfill; keep `Task.status` unchanged for normal tasks. A QA member with `VIEW_LIST` can file a Bug without a separate EDIT/FULL override; the server enforces the same create/assignment permissions the UI will show.
- [ ] Run the targeted tests and `npm run build`; inspect an old task fixture and a new bug response. Commit backend changes for this task only.

### Task 2: Bug transitions, evidence, and notifications

**Files:** Backend `src/services/bugWorkflowService.ts`, `src/routes/taskRoutes.ts`, `src/controllers/taskController.ts`, `src/services/attachmentService.ts`, `src/services/enhancedNotificationService.ts`; tests `src/__tests__/qaBugWorkflow.test.ts`.

**Interfaces:** Produces `transitionBug(taskId, action, actorId, { reason, executionId })`. Mapping: Open/Reopened=`todo`, Working=`inprogress`, Ready for QA=`review`, Verified=`done`, closed without fix=`cancelled`; transition activity records distinguish Open from Reopened.

- [ ] Write failing tests for developer Ready for QA, authorized QA Verify/Reopen, rejected unauthorized Done, reason required for reopen/close, same-workspace evidence, and recipient-specific notification.
- [ ] Implement one atomic/idempotent transition service and route; reuse existing attachment signing/storage. In this milestone, Verify records a manual retest note. Do not let generic task PATCH bypass bug verification.
- [ ] Run targeted tests, `npm run build`, and a two-user API smoke flow; commit backend task changes.

### Task 3: Web bug create/detail and bug queue

**Files:** Web `src/components/quality/BugForm.tsx`, `src/components/tasks/TaskDetailSidebar.tsx`, `src/app/workspace/[id]/spaces/[spaceId]/lists/[listId]/page.tsx`, `src/app/workspace/[id]/quality/bugs/page.tsx`, `src/components/sidebar/AppSidebar.tsx`, `src/hooks/queries/useQuality.ts`.

**Interfaces:** Consumes Task bug fields and transition API from Tasks 1–2. The Bugs route is a filtered Task view; it does not own separate bug data.

- [ ] Write failing UI tests for QA visibility, required reproduction/expected/actual fields, evidence upload, assignee choice, scoped 403 display, Ready for QA, Verify/Reopen, and filtered bug queue.
- [ ] Implement the guided form and task-panel sections; preserve normal task UI. Allow entry from an owning list and a triage flow that chooses its list.
- [ ] Run targeted Vitest, `npx tsc --noEmit`, production build, and browser smoke test as QA/developer; commit web task changes.

### Task 4: Mobile quick bug report

**Files:** Flutter task entity/model/mapper, `lib/features/tasks/presentation/widgets/create_task_sheet.dart`, task detail sheet, API repository; tests `test/features/tasks/qa_bug_flow_test.dart`.

**Interfaces:** Consumes bug creation and transition APIs from Tasks 1–2. Mobile does not implement bulk case editing.

- [ ] Write failing widget/repository tests for guided fields, evidence, list selection, server validation, and developer/QA handoff actions.
- [ ] Implement mobile bug type and focused report UI using current task navigation; surface upload and permission failures clearly.
- [ ] Run focused Flutter tests, `flutter analyze`, and Android smoke test; commit mobile task changes.

## Milestone B — replace the test spreadsheet

### Task 5: Workspace modules, suites, versioned cases

**Files:** Backend `src/models/TestSuite.ts`, `src/models/TestCase.ts`, `src/models/TestCaseRevision.ts`, `src/services/testCaseService.ts`, `src/controllers/qaCaseController.ts`, `src/routes/qaCaseRoutes.ts`; tests `src/__tests__/qaCaseLibrary.test.ts`.

**Interfaces:** Produces `createCase`, `updateCase(caseId, expectedRevision, patch)`, `listCases(workspaceId, filters, page)`, `getCaseRevision(caseId, revision)`. Stable `TC-<workspace sequence>` keys and immutable revision snapshots.

- [ ] Write failing tests for ordered steps, unique case key, pagination/filtering, revision conflict 409, retired-case history, linked-work-item access, and cross-workspace rejection.
- [ ] Implement indexed models and service/API with server-side validation and append-only revisions. Reuse the Task 1 `qualityEnabled` gate and enforce case permissions.
- [ ] Run targeted Jest and backend build; verify old revisions remain unchanged after edits; commit backend changes.

### Task 6: Case Library grid and step editor

**Files:** Web `src/app/workspace/[id]/quality/cases/page.tsx`, `src/components/quality/CaseGrid.tsx`, `CaseEditor.tsx`, `src/hooks/queries/useQuality.ts`, `src/hooks/mutations/useQualityMutations.ts`; tests near components.

**Interfaces:** Consumes Task 5 paginated/revisioned case APIs. List query key includes workspace, filter, sort, and page; mutation carries `expectedRevision`.

- [ ] Write failing UI tests for filter/sort/pagination, keyboard navigation, inline save and error recovery, version conflict preserving input, row paste, bulk selection, and ordered step editing.
- [ ] Implement the responsive grid and detail editor; keep case steps in the detail editor rather than squeezing all steps into one grid cell.
- [ ] Run focused Vitest, TypeScript, build, and a 1,000-case browser performance check; commit web changes (include new tests despite ignore rules).

### Task 7: CSV/XLSX import and export

**Files:** Backend `src/services/testCaseImportService.ts`, `src/controllers/qaCaseController.ts`, `src/routes/qaCaseRoutes.ts`, `src/__tests__/qaCaseImport.test.ts`; web `src/components/quality/CaseImportWizard.tsx` plus tests.

**Interfaces:** Produces `previewCaseImport(workspaceId, file, mapping)` with per-row validation and `commitCaseImport(previewToken, mode: create|update|skip)` with idempotent result counts. Export uses stable case IDs and ordered steps.

- [ ] Write failing tests for missing required columns, duplicate IDs/titles, malformed step rows, cross-workspace update IDs, UTF-8 input, partial row errors, and retry-safe commit.
- [ ] Implement parser/preview/commit/export with bounded file size and batch writes; present mapping, validation, and created/updated/skipped results in web.
- [ ] Run backend/web targeted tests and builds; smoke-import a sample spreadsheet, fix errors, export, and compare rows; commit each repo separately.

## Milestone C — execute, fail, fix, retest

### Task 8: Plans, runs, and saved execution results

**Files:** Backend `src/models/TestPlan.ts`, `src/models/TestRun.ts`, `src/models/TestExecution.ts`, `src/services/testRunService.ts`, `src/controllers/qaRunController.ts`, `src/routes/qaRunRoutes.ts`; tests `src/__tests__/qaExecution.test.ts`.

**Interfaces:** Produces `startRun(planId, build, environment, assignments)`, `recordExecution(executionId, expectedVersion, result, stepResults, evidence)`, `closeRun(runId)`. Run creation freezes selected case revisions.

- [ ] Write failing tests for case revision freeze, multiple runs per plan, result/reason validation, per-step evidence, corrections audit, concurrent update 409, and cross-workspace links.
- [ ] Implement indexed plan/run/execution models and atomic writes; keep result history while exposing current result.
- [ ] Run targeted Jest, backend build, and a plan→run→result API smoke flow; commit backend changes.

### Task 9: Web plan builder, run grid, and step player

**Files:** Web Quality plan/run routes, `PlanEditor.tsx`, `RunGrid.tsx`, `ExecutionPlayer.tsx`, quality query/mutation hooks; tests near components.

**Interfaces:** Consumes Task 8 APIs. Grid columns include case, tester, result, build/environment context, last update, and linked bug; focused player handles step outcomes and evidence.

- [ ] Write failing UI tests for selecting cases, starting a run, marking a step/result, required Fail/Blocked reasons, navigation to next assigned case, and recovery from 409/network failure.
- [ ] Implement plan and run screens with bulk assignment but no misleading bulk-pass shortcut; autosave only when server confirms.
- [ ] Run focused Vitest, TypeScript/build, and a manual 20-case cycle; commit web changes.

### Task 10: Failure→bug linking and retest verification

**Files:** Backend `src/services/qaDefectService.ts`, `src/routes/qaRunRoutes.ts`, `src/controllers/qaRunController.ts`, `src/services/bugWorkflowService.ts`, `src/services/enhancedNotificationService.ts`; tests `src/__tests__/qaDefectLink.test.ts`; web `src/components/quality/ExecutionPlayer.tsx` and `src/components/tasks/TaskDetailSidebar.tsx`.

**Interfaces:** Produces `createOrLinkBug(executionId, { targetListId?, assigneeId?, existingBugId?, idempotencyKey })` and verification requiring a passing retest or explicit authorized override.

- [ ] Write failing tests for prefilled expected/actual/build/evidence, duplicate-click idempotency, cross-workspace target denial, linking an existing bug, failed retest reopen, and historical fail retained after pass.
- [ ] Implement server-side link/transition and corresponding web actions; notify only developer/QA recipients for their handoff.
- [ ] Run focused backend/web tests, both builds, and two-user failure→fix→retest smoke flow; commit per repo.

### Task 11: Mobile assigned execution and retest queue

**Files:** Flutter `lib/features/quality/` repository/entities/screens/widgets, `lib/core/router/app_router.dart`; tests `test/features/quality/qa_execution_test.dart`.

**Interfaces:** Consumes Task 8 and Task 10 APIs; supports assigned cases, step/result capture, evidence, linked bug, and Ready for QA retest.

- [ ] Write failing repository/widget tests for queued cases, offline/network failure messaging, step result save, Fail reason, evidence, linked bug, and retest action.
- [ ] Implement focused mobile QA screens and routes; leave bulk imports and plan configuration on web.
- [ ] Run Flutter tests/analyze and Android smoke flow; commit mobile changes.

## Milestone D — visible and auditable release decisions

### Task 12: Live reports, snapshots, and signoff

**Files:** Backend `src/models/QaReportSnapshot.ts`, `src/services/qaReportService.ts`, `src/routes/qaReportRoutes.ts`, `src/controllers/qaReportController.ts`, tests `src/__tests__/qaReports.test.ts`; web `src/app/workspace/[id]/quality/page.tsx`, `reports/page.tsx`, `src/components/quality/ReportView.tsx`.

**Interfaces:** Produces `getLiveReport(planId)`, `createSnapshot(planId, actorId, exceptionReason?)`, `listSnapshots(workspaceId, filters)`. Completion is `(pass+fail+blocked+skipped)/selected`; pass rate is `pass/(pass+fail)` with visible denominators.

- [ ] Write failing tests for 12 pass/3 fail/2 blocked/3 not run counts, zero-denominator display, open/reopened bug gate, archived revision history, snapshot immutability, override permission/reason, and PDF/CSV export source data.
- [ ] Implement aggregate queries, blocker rules, immutable snapshot/signoff, CSV export, browser print-to-PDF, and web live/historical report views.
- [ ] Run focused backend/web tests, builds, and a completed-cycle report smoke test; commit both repos separately.

## Milestone E — optional automation after the manual flow ships

### Task 13: Import automated results by stable case ID

**Files:** Backend `src/services/qaAutomationImportService.ts`, quality import route, tests; web run import status; documentation for CI/JUnit producers.

**Interfaces:** `importAutomatedResults(workspaceId, build, environment, sourceRunKey, results[])` maps stable case IDs to executions and is idempotent by source run key. Unknown IDs are reported, never silently created.

- [ ] Write failing tests for duplicate CI upload, unknown case ID, cross-workspace ID, rerun on new build, and manual result preservation.
- [ ] Implement bounded JUnit/result import with clear reconciliation output and audit.
- [ ] Run targeted tests/build and CI fixture smoke test; commit backend/web changes.

## Rollout and completion checks

- [ ] Run backend Jest/build, frontend Vitest/TypeScript/production build, Flutter tests/analyze, and real-device/browser smoke checks for each milestone; record results with the milestone, not as an unsupported claim of production speed or reliability.
- [ ] Deploy backend additive schema/API first, then web, then Flutter. Backfill existing tasks, enable the workspace flag for a pilot, and verify old task views and QA permissions before wider rollout.
- [ ] Pilot with one real feature: case creation/import, a failed run, linked developer bug, Ready for QA, passing retest, and signed report. Validate both workspace isolation and notification recipients with two accounts.
- [ ] Roll back by disabling `qualityEnabled` if required; additive data remains intact and existing task routes remain available.
