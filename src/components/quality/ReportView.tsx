import type { QualityReport, QualityReportCase } from '@/hooks/queries/useQuality';

const resultLabel: Record<string, string> = {
  pass: 'Passed', fail: 'Failed', blocked: 'Blocked', skipped: 'Skipped', not_run: 'Not run',
};

function CaseReport({ testCase }: { testCase: QualityReportCase }) {
  return <article className="break-inside-avoid rounded-lg border bg-card p-4 print:border-gray-300 print:bg-white">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">{testCase.key} · Revision {testCase.revision ?? '—'}</p>
        <h3 className="mt-1 text-base font-semibold">{testCase.title}</h3>
      </div>
      <span className="rounded-md border px-2.5 py-1 text-xs font-medium">{resultLabel[testCase.result] || testCase.result}</span>
    </div>

    <dl className="mt-3 grid gap-x-5 gap-y-2 border-t pt-3 text-sm sm:grid-cols-3 print:grid-cols-3">
      <div><dt className="text-xs text-muted-foreground">Tested by</dt><dd>{testCase.tester || 'Not recorded'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Assigned tester</dt><dd>{testCase.assignee || 'Unassigned'}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Result recorded</dt><dd>{testCase.updatedAt ? new Date(testCase.updatedAt).toLocaleString() : 'Not run'}</dd></div>
    </dl>

    {testCase.reason && <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm print:bg-white"><h4 className="text-xs font-semibold text-muted-foreground">Run note</h4><p className="mt-1 whitespace-pre-wrap">{testCase.reason}</p></div>}

    {testCase.steps.length > 0 && <div className="mt-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step results</h4>
      <div className="overflow-x-auto rounded-md border print:overflow-visible">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground print:bg-white"><tr><th className="w-12 px-3 py-2">Step</th><th className="px-3 py-2">Action / expected</th><th className="px-3 py-2">Actual result</th><th className="w-24 px-3 py-2">Result</th></tr></thead>
          <tbody className="divide-y">{testCase.steps.map(step => <tr key={step.number} className="align-top"><td className="px-3 py-2 font-mono text-xs">{step.number}</td><td className="px-3 py-2"><p>{step.action}</p>{step.testData && <p className="mt-1 text-xs text-muted-foreground print:text-gray-600">Data: {step.testData}</p>}<p className="mt-1 text-xs text-muted-foreground print:text-gray-600">Expected: {step.expectedResult || '—'}</p></td><td className="whitespace-pre-wrap px-3 py-2">{step.actualResult || '—'}</td><td className="px-3 py-2">{resultLabel[step.result] || step.result}</td></tr>)}</tbody>
        </table>
      </div>
    </div>}

    {(testCase.evidence.length > 0 || testCase.linkedBugs.length > 0 || (testCase.hiddenLinkedBugCount || 0) > 0) && <div className="mt-4 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
      {testCase.evidence.length > 0 && <div><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence</h4><ul className="mt-1 list-inside list-disc text-sm">{testCase.evidence.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul></div>}
      {(testCase.linkedBugs.length > 0 || (testCase.hiddenLinkedBugCount || 0) > 0) && <div><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked developer bugs</h4><ul className="mt-1 space-y-1 text-sm">{testCase.linkedBugs.map(bug => <li key={bug.id} className="rounded-md border px-2.5 py-2"><span className="font-medium">{bug.title}</span><span className="text-muted-foreground"> · {bug.status} · {bug.priority}</span><p className="text-xs text-muted-foreground">Assignee: {bug.assignee || 'Unassigned'} · {bug.verification.status === 'verified' ? `Verified by ${bug.verification.verifiedBy || 'QA'}${bug.verification.note ? ` — ${bug.verification.note}` : ''}` : 'Not verified'}</p></li>)}{Boolean(testCase.hiddenLinkedBugCount) && <li className="text-xs text-muted-foreground">{testCase.hiddenLinkedBugCount} linked bug(s) are hidden by your access permissions.</li>}</ul></div>}
    </div>}
  </article>;
}

export function ReportView({ report, signedByName }: { report: QualityReport; signedByName?: string | null }) {
  const { counts, completion, passRate, gate } = report;
  return <div className="space-y-5 text-foreground print:text-black">
    <section className="rounded-lg border bg-card p-4 print:border-gray-300 print:bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground print:text-gray-600">Test plan</p><h2 className="mt-1 text-lg font-semibold">{report.plan.name}</h2>{report.plan.description && <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground print:text-gray-700">{report.plan.description}</p>}<p className="mt-2 text-xs text-muted-foreground print:text-gray-600">Report generated {new Date(report.generatedAt).toLocaleString()}</p></div>{signedByName && <p className="text-sm text-muted-foreground print:text-gray-700">Signed by <span className="font-medium text-foreground print:text-black">{signedByName}</span></p>}</div>
      {report.latestRun ? <dl className="mt-4 grid gap-x-5 gap-y-3 border-t pt-3 text-sm sm:grid-cols-4 print:grid-cols-4"><div><dt className="text-xs text-muted-foreground print:text-gray-600">Build</dt><dd className="font-medium">{report.latestRun.build}</dd></div><div><dt className="text-xs text-muted-foreground print:text-gray-600">Environment</dt><dd className="font-medium">{report.latestRun.environment}</dd></div><div><dt className="text-xs text-muted-foreground print:text-gray-600">Platform</dt><dd className="font-medium">{report.latestRun.platform || '—'}</dd></div><div><dt className="text-xs text-muted-foreground print:text-gray-600">Run</dt><dd className="font-medium">{report.latestRun.status === 'closed' ? 'Closed' : 'Open'}{report.latestRun.startedAt ? ` · ${new Date(report.latestRun.startedAt).toLocaleString()}` : ''}</dd></div></dl> : <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">No test run has been recorded for this plan.</p>}
    </section>

    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border bg-card p-4 print:border-gray-300 print:bg-white"><div className="text-xs font-medium text-muted-foreground print:text-gray-600">Completion</div><div className="mt-2 text-xl font-semibold">{completion.numerator} / {completion.denominator}</div><div className="text-xs text-muted-foreground print:text-gray-600">{completion.percent === null ? '—' : `${completion.percent}%`} of selected cases have a result</div></div><div className="rounded-xl border bg-card p-4 print:border-gray-300 print:bg-white"><div className="text-xs font-medium text-muted-foreground print:text-gray-600">Pass rate</div><div className="mt-2 text-xl font-semibold">{passRate.numerator} / {passRate.denominator}</div><div className="text-xs text-muted-foreground print:text-gray-600">{passRate.percent === null ? '—' : `${passRate.percent}%`} of pass or fail results passed</div></div></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 print:grid-cols-5">{([['Pass', counts.pass], ['Fail', counts.fail], ['Blocked', counts.blocked], ['Skipped', counts.skipped], ['Not run', counts.notRun]] as const).map(([label, count]) => <div key={label} className="rounded-lg border bg-card p-3 print:border-gray-300 print:bg-white"><div className="text-lg font-semibold">{count}</div><div className="text-xs text-muted-foreground print:text-gray-600">{label}</div></div>)}</div>
    <div className={`rounded-xl border p-4 print:bg-white ${gate.ready ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 print:border-gray-400' : 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 print:border-gray-400'}`}><h3 className="text-sm font-semibold">{gate.ready ? 'Release gate clear' : 'Release gate has blockers'}</h3><p className="mt-1 text-sm text-muted-foreground print:text-gray-700">{counts.fail} failed · {counts.blocked} blocked · {counts.notRun} not run · {gate.unresolvedHighBugs} unresolved high-priority {gate.unresolvedHighBugs === 1 ? 'bug' : 'bugs'}{report.latestRun?.status === 'open' ? ' · run still open' : ''}</p></div>

    <section className="space-y-3"><div><h2 className="text-lg font-semibold">Case-by-case results</h2><p className="text-sm text-muted-foreground print:text-gray-600">{report.cases?.length ?? counts.selected} selected cases · {report.latestRun ? `latest run on build ${report.latestRun.build}` : 'no run yet'}</p></div>
      {report.cases === undefined ? <div className="rounded-lg border p-4 text-sm text-muted-foreground print:border-gray-300">This older signed snapshot contains summary counts only; detailed case results were not saved when it was signed.</div> : report.cases.length === 0 ? <div className="rounded-lg border p-4 text-sm text-muted-foreground">No cases are included in this plan.</div> : <div className="space-y-3">{report.cases.map(testCase => <CaseReport key={testCase.id} testCase={testCase} />)}</div>}
    </section>
  </div>;
}
