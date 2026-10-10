# TeamsEver QA and Test Management Design

**Status:** Proposed plan; no product implementation authorized by this document  
**Date:** 2026-10-09  
**Scope:** TeamsEver backend, web, and Flutter mobile

## Outcome

A workspace team can trace a requirement or feature through reusable test cases, execution on a named build and environment, a failed result, an assigned developer bug, a fix, a QA retest, and a release decision. QA can enter and review many cases quickly in a spreadsheet-like web grid. Developers continue to receive bugs in their existing space/list work board. The mobile app supports fast bug reporting and retesting; bulk case authoring remains a web workflow.

## Existing foundation and constraints

- Work is organized as workspace → space → optional folder → list → task. A `Task` already has title, description, status, priority, assignee, activity, subtasks, and attachments. Existing task statuses are `todo`, `inprogress`, `review`, `done`, and `cancelled` in the main UI. The backend also accepts `blocked`; reconcile that mismatch before QA rollout.
- QA already has `CREATE_TASK`, `EDIT_TASK`, `CHANGE_STATUS`, and `COMMENT_TASK`, but does not have `ASSIGN_TASK` or `MARK_TASK_DONE` by default. The web list page hides New Task unless the viewer has scoped EDIT/FULL access. Server and UI decisions must be made consistent.
- The web task panel displays attachments but does not expose task evidence upload there. The backend has signed attachment endpoints.
- The Flutter task create sheet handles a generic task with title, description, and priority; it has no QA artifact flow.
- Existing tasks, saved links, boards, permissions, activity, and notifications must keep working. Every existing task is treated as type `task` after migration.
- QA artifacts are workspace-scoped. Every cross-reference must belong to the same workspace. A case may reference a space, module, and work items, but does not require a separate Login list. A list is a meaningful work queue; a module identifies a feature such as Login.

## Product structure

| Artifact | What it means | Location |
| --- | --- | --- |
| Task | Developer/product work | Existing space/list board |
| Bug | Developer work created manually or from a failed execution | Same board, `workItemType=bug` |
| QA module | Controlled feature label such as Authentication or Login | Workspace QA settings; may reference a space |
| Test suite | Reusable grouping of cases | QA Library |
| Test case | Versioned instructions and expected outcomes | QA Library |
| Test plan | Selected cases for a release, sprint, or goal | QA Plans |
| Test run | A plan executed against one build/environment | QA Runs |
| Case execution | One case result in a run, including step outcomes and evidence | QA Run detail |
| Report snapshot | Frozen summary at run/plan close or explicit signoff | QA Reports |

This is not a second work board. The QA area lists and links bugs, but their source of truth remains the existing task record. The QA module and suite hierarchy are not copies of workspace folders or lists.

## Bug record and workflow

- Add `workItemType: task | bug` to `Task`, default `task`. A bug requires a concise summary, reproduction steps, expected result, actual result, severity, and environment/build. Reporter and creation time come from the server. Evidence, linked case/execution, module, assignee, and priority are supported. Do not conflate severity (impact) with priority (scheduling).
- Bug workflow reuses the existing board columns while giving bugs clear labels: `todo` = Open or Reopened; `inprogress` = In Progress; `review` = Ready for QA; `done` = Verified; `cancelled` = closed without fix with a recorded resolution. Store reopen history in activity rather than adding a second mutable status field.
- A developer can move an assigned bug to Ready for QA. An authorized QA member records Pass or Fail with a retest note and optional evidence. Pass moves it to Verified; Fail moves it back to Open and flags it Reopened. A required reason accompanies Fail and closure without fix. Before the execution module ships, a manual retest note is sufficient; once a case is linked, a passing execution is preferred and a manual override requires an explicit reason. Normal task Done approval remains unchanged; bug verification is a distinct server-checked permission.
- Creating or assigning a bug notifies only the responsible person and relevant watchers; Ready for QA notifies the assigned QA owner or eligible QA queue, and a failed retest notifies the developer. Notifications link to the exact bug/execution.
- The current feedback form's “Bug Report” remains product feedback and is never silently converted into a workspace developer bug.

## Case Library

- Cases have a stable workspace key, title, module, suite, owner, priority, type (`manual` initially; `automated` reserved), state (`draft`, `active`, `retired`), preconditions, ordered steps (`action`, optional test data, `expectedResult`), and links to the work they cover.
- Saving meaningful case changes creates a revision. An execution stores the revision ID and a snapshot of its steps. Editing or retiring a case must not rewrite historical run results.
- A case can belong to one primary suite and reference multiple work items. Moving a case between suites does not change its ID or execution history. Archive rather than hard-delete cases with executions.
- Library web grid: ID, title, module, suite, priority, owner, state, last result, updated time; searchable/filterable/sortable, keyboard accessible, paginated, with safe inline edits, multi-select, paste rows, and bulk reassignment/state changes. A side panel edits full steps and links. Inline writes show saving/error states and handle version conflicts without losing input.
- Import CSV/XLSX through a preview and column-mapping screen. Validate required fields and steps, show row-level errors, detect duplicate keys/titles, choose create versus update, and show a final created/updated/skipped summary. Export selected cases with steps and stable IDs. The database is the source of truth, not an attached spreadsheet.

## Plans, runs, and execution

- A plan names its workspace, release/sprint label, owner, selected case IDs, and optional scope. Plans can be draft, active, or closed. A case may appear in multiple plans.
- Starting a run chooses a plan, build identifier, environment (platform, device/OS, browser/app version as relevant), tester assignments, and start time. A plan can have multiple runs. Each selected case starts `not_run` with a frozen case revision.
- Execution result is `not_run`, `pass`, `fail`, `blocked`, or `skipped`. The tester records actual result, notes, evidence, and optional per-step result. Fail requires an actual result; Blocked and Skipped require a reason. Keep executedBy/At and an append-only result-change audit.
- “Create bug from failure” proposes a prefilled bug with case, failed step, expected/actual, build/environment, and evidence; the user selects its owning space/list and developer. The operation is idempotent for one execution unless the user explicitly creates another defect. A bug can be linked to multiple failed executions, and a failed execution can link to an existing bug.
- Retest creates a new execution/run result for the fixed build. Previous failure remains visible. Verification of a bug must reference a passing retest or record a manual override reason.

## Reports and release decision

- A live report updates from saved executions while a run is open. It shows selected, pass, fail, blocked, skipped, and not-run counts; coverage by module and linked requirement; open/reopened/verified bugs; build/environment; tester progress; and case history.
- Completion = `(pass + fail + blocked + skipped) / selected`. Pass rate = `pass / (pass + fail)`; show both numerator and denominator. Never count blocked/skipped as passed, and show not-run explicitly.
- Closing a run or signing off a plan creates an immutable report snapshot with counts, source run IDs, filters, build/environment, signoff actor/time, and any exception reason. Later edits create a new snapshot; they do not overwrite the old one. Export CSV and PDF from a snapshot.
- Default release gate identifies required not-run or blocked cases, failed cases, and unresolved high/urgent bugs. An owner/manager may record an auditable exception; the system must not silently mark a release ready.

## Permissions and security

- Introduce distinct permissions for viewing QA, authoring cases, executing cases, managing plans, creating bugs, triaging/assigning bugs, verifying bugs, viewing reports, and signing off/overriding gates. Map them to existing system/custom roles. QA default can author, execute, report bugs, and verify; developer default can view linked cases and work assigned bugs; manager/owner can triage, manage plans, and sign off. Workspace admins may customize these grants.
- Server enforces workspace membership and object scope on every read/write/link; the web and Flutter UIs reflect server permissions. Fix the existing QA New Task scoped-access mismatch and assignment behavior as part of the bug foundation.
- Evidence uploads use signed storage, file type/size checks, ownership checks, and existing attachment access rules. No cross-workspace file or artifact references.
- A permitted QA member can report a bug even when a workspace has reached its ordinary task quota. Bug submission is exempt from that quota initially, with workspace rate limiting and audit; pricing policy can be reviewed separately.
- All mutation endpoints validate input, record actor/time, and use stable pagination and indexes for large libraries/runs. Sensitive test data must not be required in case steps; secrets/credentials are represented by named test fixtures rather than literal passwords.

## Screens

- Workspace sidebar: **Quality** → Overview, Cases, Plans & Runs, Bugs, Reports. The Bugs page is a saved/filterable view of board work items, not a separate bug database.
- Case Library: fast grid plus full case editor/step table. Plans: select cases and start runs. Run detail: execution grid and focused step player. Reports: live metrics and historical signed snapshots.
- Existing task detail panel: bug-specific details, links to case/execution, upload evidence, developer/QA handoff actions, and activity trail. Normal tasks retain their current layout.
- Flutter: bug creation with evidence, My QA queue, focused test execution/retest, and report summary. Bulk import, complex case editing, and report configuration are web-first.

## Delivery milestones

1. **Foundation and bug flow:** type, permissions, guided create/edit, evidence, assignment, Ready for QA, Verified/Reopened, notifications, mobile quick report. Developers can receive and complete a bug before any case library exists.
2. **Case Library:** modules/suites, versioned cases, web grid/step editor, links, CSV/XLSX import/export. QA can replace a standalone test spreadsheet.
3. **Execution:** plans, runs, frozen revisions, results/evidence, failure→bug link, retest. QA can perform a complete release cycle.
4. **Reports and release gates:** live metrics, snapshots/export, audit, blocker view, signoff/exception flow. Managers can make an evidence-backed release decision.
5. **Automation integration:** import CI results (for example JUnit) by stable case ID and build; do not make this a prerequisite for manual QA.

Each milestone must be usable independently and include backend permission/integration tests, web behavior tests, relevant Flutter tests, build checks, and a real-workspace smoke test. Roll out behind a workspace feature flag until the full handoff and historical-data checks pass.

## Concrete acceptance scenario

QA creates case `TC-014` for existing-account Google sign-in, links it to the Login module and the related task, and includes ordered steps. A plan for build `1.8.4` selects it. The Android run fails with an actual result and screenshot. “Create bug” makes `BUG-42` in the owning product backlog, assigned to a developer and linked to the failure. The developer fixes it and sends it Ready for QA. QA runs the same case on build `1.8.5`; the new result passes, `BUG-42` becomes Verified, and both the earlier failure and later pass remain in history. The release report shows the current result, the prior defect, and any remaining blockers.

## Explicit boundaries

- Do not create a list per screen or put every test case on the developer Kanban board.
- Do not require Jira synchronization, AI case generation, BDD/Gherkin, automatic flaky-test detection, or CI import for the first complete manual workflow.
- Do not migrate existing Feedback submissions into Bugs automatically.
- Do not rewrite historical executions when a test case changes.
