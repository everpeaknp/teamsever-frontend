export type GuideSection = {
  id: string;
  title: string;
  eyebrow: string;
  intro: string;
  steps: string[];
  example?: { title: string; lines: string[] };
  callout?: string;
  link?: { label: string; path: string };
};

export const qualityGuidebookSections: GuideSection[] = [
  {
    id: 'start-here', eyebrow: 'Orientation', title: 'How Quality fits together',
    intro: 'Quality is the shared place to describe what should work, run those checks against a particular build, record what happened, and send real failures to the developers who own the work. It is designed around a repeatable loop, not a pile of unrelated checklists.',
    steps: [
      'A case is a reusable instruction: one behavior to check, its setup, ordered actions, and the result you expect. A case does not say whether today’s build passed.',
      'A plan is a named selection of active cases, usually for a feature, release, or regression pass. A plan can be run again against later builds.',
      'A run is one execution of a plan against a named build and environment. Each selected case gets an execution record with its own tester, result, notes, and evidence.',
      'A bug is normal developer work created from a failed or blocked execution. The run context stays linked so QA and developers can follow the failure through a fix and retest.',
      'A report summarizes a plan’s latest run, completion, pass rate, and release gate. A signed snapshot preserves the report as it looked at sign-off time.',
    ],
    example: { title: 'The whole loop', lines: ['Write “Existing user can sign in with Google” once.', 'Put that case in “October release regression.”', 'Run the plan against build 2.4.0 on staging.', 'Record Pass or Fail for each execution; attach a screenshot when it helps.', 'Create a linked bug for a reproducible failure, then verify the fix in a later run.', 'Review the report and sign a snapshot when the release decision is made.'] },
  },
  {
    id: 'scope', eyebrow: 'Before you create data', title: 'Choose the right QA scope',
    intro: 'The scope selector at the top of Quality decides which project owns the cases, modules, suites, plans, runs, and reports you see. Think of it as choosing the QA home for this work before you start.',
    steps: [
      'Choose “Entire workspace” for QA data that belongs to the whole workspace or for older records that were created before folder projects existed.',
      'Choose a folder project when the work belongs to one product or team project inside a space, such as Development / Yummy. Data created there stays with that QA project.',
      'Create a folder project from the scope header when it does not exist yet. Choose the folder and give the project a clear name. A folder can have one QA project.',
      'Switch scopes to move between projects. The selected scope is reflected in the URL and remembered for that workspace, so links and refreshes return you to the same place.',
      'A workspace project and a folder project are separate data scopes. Selecting the workspace does not combine every folder project into one report.',
    ],
    example: { title: 'Everacy → Development → Yummy', lines: ['Select the Yummy folder project before writing Yummy cases or plans.', 'Select another folder project for another product, even though both live in Everacy.', 'Use Entire workspace only for organization-wide QA or its existing legacy cases.'], },
    callout: 'Scope separates QA data; it does not create separate folder permissions. Members still need the relevant workspace Quality permission, and folder visibility follows the app’s existing workspace and folder access rules.',
  },
  {
    id: 'organize', eyebrow: 'Set up once', title: 'Organize a project and set its rules',
    intro: 'A small amount of structure makes the library easier to search and makes reports comparable. Start with a few meaningful modules and suites rather than trying to model every screen or team on day one.',
    steps: [
      'Create modules for major product areas, such as Authentication, Orders, Payments, or Attendance.',
      'Create suites for a test purpose or journey, such as Smoke, Regression, Checkout, or Mobile acceptance. Suites can be grouped under a module.',
      'Open QA settings for the selected scope to configure case types, review statuses and transitions, custom fields, allowed run environments and platforms, evidence rules, bug handoff defaults, and QA notifications.',
      'Folder projects inherit workspace defaults until you change their settings. Save an override only when that project truly needs different rules; use “Use workspace defaults” to remove the override.',
      'Choose a default developer list for bug handoff that is inside the project’s folder. This gives QA a sensible default while still allowing the reporter to choose an allowed list.',
    ],
    example: { title: 'A sensible Yummy starting structure', lines: ['Modules: Authentication, Menu, Checkout, Orders.', 'Suites: Smoke, Release regression, Android, iOS.', 'Environments: staging, production-like.', 'Platforms: Web, Android, iOS. Configure only the values the team actually uses.'] },
    link: { label: 'Open QA settings', path: 'settings' },
  },
  {
    id: 'cases', eyebrow: 'Build the library', title: 'Write cases people can execute consistently',
    intro: 'A good test case removes guesswork. Keep one case focused on one outcome, use concrete actions, and write an expected result for every step. Cases are versioned: editing a saved case creates a new revision while existing runs keep their frozen copy.',
    steps: [
      'Open Case library and choose New case. Give the case a title that states the behavior, for example “Existing user can sign in with Google.”',
      'Choose a module and suite so people can find the case later. Set priority, case type, and review status. Complete every enabled required custom field.',
      'Add preconditions such as the account state, test environment, or fixture that must exist before the first action. Never put real passwords or secrets in a case.',
      'For each step, write an action, optional test data, and an observable expected result. “Click Continue” is an action; “The account dashboard appears and the user is signed in” is an expected result.',
      'Save, then review the case as if a teammate who did not write it had to execute it. Remove ambiguous words such as “normally,” “quickly,” and “looks right.”',
      'Use import to preview a CSV/XLSX before committing it. Choose how existing keys are handled: skip, update existing, or create new while skipping existing. Export always follows the currently selected scope.',
    ],
    example: { title: 'Case example: Existing user can sign in with Google', lines: ['Precondition: A registered test account is available and Google sign-in is enabled in staging.', 'Step 1 action: Open the login page. Expected: Email, password, and Google sign-in controls are visible.', 'Step 2 action: Select Continue with Google and authenticate as the test account. Expected: The provider returns to the app without an error.', 'Step 3 action: Wait for the app to finish loading. Expected: The account dashboard appears and shows the correct user.', 'Test data: Use the approved QA account from the team password manager; do not paste its password here.'] },
    callout: 'Case review status and run result are different. “Active” means a case can be selected for a run; “Pass” or “Fail” describes what happened in one particular execution.',
    link: { label: 'Open the case library', path: 'cases' },
  },
  {
    id: 'plans-runs', eyebrow: 'Test a build', title: 'Create a plan and start a run',
    intro: 'Plans give a test effort a name and stable case selection. Runs record what happened for one build, environment, and platform, so a future release can be compared without rewriting the cases.',
    steps: [
      'Open Plans & runs and create a plan with a name people can recognize, such as “Yummy 2.4 release regression.” Add a short description if it clarifies what is in or out of scope.',
      'Select the active cases to include. Selection can span pages. Retired or otherwise terminal cases cannot be executed.',
      'Start a run from the plan. Enter the exact build or release identifier, choose a configured environment and platform, and assign testers to cases where ownership should be explicit.',
      'Assignments are per case, so a team can divide a large regression run. The assigned tester records that case; a manager with the relevant release permission can oversee the run.',
      'Run the checks on the stated build and environment. If the build changes, start a new run instead of mixing results from two builds.',
      'Close a run when the execution pass is finished. Closed runs provide a stable checkpoint for report review and sign-off.',
    ],
    example: { title: 'Release run details', lines: ['Plan: Yummy 2.4 release regression.', 'Build: web-2.4.0-rc3 (use your real build identifier).', 'Environment: staging.', 'Platform: Web.', 'Assignment: checkout cases to the checkout tester; authentication cases to the auth tester.'] },
    link: { label: 'Open plans and runs', path: 'plans' },
  },
  {
    id: 'execution', eyebrow: 'Record what happened', title: 'Execute cases and record useful results',
    intro: 'An execution is the result of one case in one run. Record enough detail that another person can understand the result without repeating your entire investigation.',
    steps: [
      'Open a run and select a case to see its frozen steps and revision. The run continues to show the revision it started with even if the library case is edited later.',
      'Work through each step and record its result. A passing overall result requires every step to be marked Pass.',
      'For Fail or Blocked, add a reason describing the observed behavior or the dependency preventing the check. Keep the note factual and reproducible.',
      'Attach screenshots or other allowed evidence from the execution when they clarify the issue. Wait for uploads to finish before saving the final result.',
      'Save the execution. If another person changed it in the meantime, the version conflict asks you to reload and compare rather than silently overwrite their result.',
      'Use Blocked when the check could not be completed because of an environment, account, or dependency problem. Do not use it as a softer form of Fail.',
    ],
    example: { title: 'Useful failure note', lines: ['Build/environment: the run already records these; confirm they are correct.', 'Action: selected Continue with Google after authenticating.', 'Expected: return to the account dashboard.', 'Actual: browser returned to /login and displayed “Something went wrong.”', 'Evidence: attach the error screenshot with private tokens or personal information removed.'] },
  },
  {
    id: 'evidence', eyebrow: 'Screenshots and files', title: 'Attach evidence that helps someone reproduce it',
    intro: 'Evidence belongs to an execution, so it stays beside the case result and run context. Use it to show a visible failure, a key state, or a detail that is difficult to describe in text.',
    steps: [
      'Open the execution from a run and use the Evidence file picker to upload a screenshot or another accepted file.',
      'Wait for the upload to finish and confirm it appears in the evidence list before saving the execution result.',
      'Write a short reason alongside the file: what screen or action the evidence captures and why it matters.',
      'Use a focused image and remove credentials, session tokens, customer data, and unrelated desktop content before uploading.',
      'If evidence is required by the project’s run settings, include it for the configured failure outcomes; the UI will report a validation error if required evidence is missing.',
    ],
    callout: 'An uploaded file is linked to that execution. If the upload fails, the result can still be saved when evidence is optional; retry the upload and verify it is listed before relying on it as the bug’s only reproduction evidence.',
  },
  {
    id: 'bugs', eyebrow: 'Developer handoff', title: 'Turn a failure into a linked bug',
    intro: 'Create a bug from a failed or blocked execution when there is a product defect for developers to fix. The system can carry the case, expected outcome, actual result, build, and environment into the bug, and link the bug back to the execution.',
    steps: [
      'Open the failed or blocked execution and choose Create or link developer bug. For a new bug, choose an allowed list in the project folder and set severity.',
      'Use the default list from QA settings when it is the right team; otherwise choose the list that owns the component. Folder projects reject lists outside their folder.',
      'Review the generated title and context, then add anything developers need that the case did not capture: exact reproduction detail, scope, or relevant environment notes.',
      'The bug appears as a normal work item in its developer list and remains connected to its QA project and source execution. Avoid creating duplicates; link an existing bug when it describes the same defect.',
      'The developer moves the bug through the available handoff actions: start work, mark Ready for QA, or close without a fix when permitted. QA retests from a later run and links a passing execution to verify the fix.',
      'When QA reopens a bug, include a concise retest note. A bug is not verified just because a developer says it is fixed; link a passing retest.',
    ],
    example: { title: 'Yummy checkout failure', lines: ['A payment case fails on staging build web-2.4.0-rc3.', 'Create the bug from that execution and route it to the Yummy checkout list.', 'The bug carries the expected result, actual failure, build/environment, and source execution.', 'After the developer marks Ready for QA, run the case against the fix build.', 'Link the passing execution to the existing bug and choose Verify fix with a short retest note.'] },
    link: { label: 'Open developer bugs', path: 'bugs' },
  },
  {
    id: 'reports', eyebrow: 'Release decisions', title: 'Read reports and sign a snapshot',
    intro: 'A live report describes the selected plan’s latest run. It shows selected cases, results, completion, pass rate, and the release gate. Use it to understand readiness; use a signed snapshot when you need a durable record of the decision.',
    steps: [
      'Open Reports in the same QA scope and choose a plan. The report uses that plan’s latest run; confirm the build, environment, and status match the release you are reviewing.',
      'Completion answers how much of the selected work has a recorded result. Pass rate uses executed outcomes as its denominator, so inspect the counts rather than treating an empty denominator as a perfect pass.',
      'Review failed and blocked executions, unresolved high-severity bugs, and the gate details. A clean-looking percentage alone does not mean a release is safe.',
      'Close the current run before sign-off. If the gate is not ready, the signer must record an exception reason so the decision and its risk are explicit.',
      'Sign the snapshot to preserve the report counts and context at that moment. Later runs and bug changes do not rewrite that historical snapshot.',
      'Download CSV or print the signed snapshot when a release review needs an exportable record.',
    ],
    example: { title: 'Before approving a release', lines: ['Confirm the latest run belongs to the intended release build.', 'Check that no required cases are still Not run or Blocked.', 'Review failures and unresolved high-severity bugs with their owners.', 'Record any accepted risk in the exception reason, then sign the report snapshot.'] },
    link: { label: 'Open reports', path: 'reports' },
  },
  {
    id: 'permissions', eyebrow: 'Access and troubleshooting', title: 'Permissions, notifications, and common fixes',
    intro: 'Quality uses workspace permissions to control who can view, author, execute, manage releases, triage bugs, verify fixes, and sign reports. The precise actions available depend on the permissions granted to the member or custom role.',
    steps: [
      'QA_VIEW allows a member to view Quality data. QA_MANAGE_CASES controls case and library authoring. QA_EXECUTE allows recording test results and evidence.',
      'QA_MANAGE_RELEASES covers release-plan and run management and report viewing in the current permission mapping. QA_CREATE_BUG, QA_TRIAGE_BUG, and QA_VERIFY_BUG control bug actions. QA_SIGN_OFF controls report sign-off.',
      'If a project is missing from the selector, ask a workspace manager to confirm the folder is accessible and that its QA project was created.',
      'If a case or plan is missing, check the selected scope first. Workspace and folder projects are separate; switching to Entire workspace does not aggregate folder data.',
      'If a run cannot start, check that the plan has active cases and that its environment/platform match the selected project’s QA settings.',
      'If a bug handoff list is unavailable, confirm it belongs to the selected folder and that you can view and report bugs in that list.',
      'If a screenshot does not appear, check upload completion, allowed file type and size, and whether the file service is configured; then retry from the execution.',
      'If the result says it changed while you were editing, reload the run and compare the latest execution before saving again.',
    ],
    callout: 'Folder-scoped QA projects organize the data. They are not a separate permission boundary; do not use project selection to hide sensitive data from workspace members.',
  },
  {
    id: 'yummy-example', eyebrow: 'Worked example', title: 'A complete QA cycle for Yummy',
    intro: 'This example shows how a team could use the current tools for the Yummy project under Everacy → Development. Replace the sample release and build names with your real values.',
    steps: [
      'Select the Yummy folder project. If it is not present, create the folder project once from the Quality scope header.',
      'Set up modules Authentication, Menu, Checkout, and Orders; add Smoke and Release regression suites. Configure staging and the real target platforms in QA settings.',
      'Create focused cases for sign-in, browsing the menu, placing an order, and confirming the order receipt. Put each case in the right module and suite.',
      'Create a plan named “Yummy 2.4 release regression” and select the active cases needed for this release. Keep broader exploratory work outside the deterministic release cases unless you have a clear case for it.',
      'Start a run for the exact candidate build on staging and assign cases to the relevant testers. Testers execute from the frozen case revisions and attach evidence for failures.',
      'Create linked developer bugs in the Yummy lists for real product defects. Developers work those tasks and mark them Ready for QA; testers retest in a new run.',
      'Link passing retests to the bugs, close the run, inspect the latest report, discuss any remaining risk, and sign the snapshot when the release decision is recorded.',
    ],
    callout: 'The workspace remains Everacy. The folder project is the QA home for Yummy; selecting it keeps Yummy cases, plans, runs, and reports together without requiring a separate paid workspace.',
  },
];

export function filterGuidebookSections(query: string): GuideSection[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return qualityGuidebookSections;
  return qualityGuidebookSections.filter(section => JSON.stringify(section).toLocaleLowerCase().includes(normalized));
}
