import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportView } from './ReportView';
import type { QualityReport } from '@/hooks/queries/useQuality';

const base: QualityReport = {
  plan: { id: 'p1', name: 'Release 1' }, latestRun: null, runIds: [], generatedAt: '2026-10-10T00:00:00.000Z',
  cases: [{ id: 'c1', key: 'TC-001', title: 'Sign in', revision: 2, result: 'fail', tester: 'QA Tester', assignee: 'QA Tester', updatedAt: '2026-10-10T12:00:00.000Z', reason: 'Could not sign in', steps: [{ number: 1, action: 'Submit credentials', expectedResult: 'Dashboard opens', actualResult: 'Error displayed', result: 'fail' }], evidence: [{ name: 'login-error.png', mimeType: 'image/png', size: 100 }], linkedBugs: [{ id: 'b1', title: 'Sign in regression', status: 'review', priority: 'high', assignee: 'Developer', verification: { status: 'not_verified' as const } }] }],
  counts: { selected: 20, pass: 12, fail: 3, blocked: 2, skipped: 0, notRun: 3 },
  completion: { numerator: 17, denominator: 20, percent: 85 },
  passRate: { numerator: 12, denominator: 15, percent: 80 },
  gate: { ready: false, unresolvedHighBugs: 1, blockers: 9 },
};

describe('ReportView', () => {
  it('shows denominators and blockers without hiding not-run cases', () => {
    render(<ReportView report={base} />);
    expect(screen.getByText('17 / 20')).toBeTruthy();
    expect(screen.getByText('12 / 15')).toBeTruthy();
    expect(screen.getByText(/3 not run/)).toBeTruthy();
    expect(screen.getByText(/1 unresolved high-priority bug/)).toBeTruthy();
    expect(screen.getByText('Case-by-case results')).toBeTruthy();
    expect(screen.getByText('Sign in regression')).toBeTruthy();
    expect(screen.getByText('login-error.png')).toBeTruthy();
  });
  it('uses an em dash for a zero-denominator pass rate', () => {
    render(<ReportView report={{ ...base, passRate: { numerator: 0, denominator: 0, percent: null } }} />);
    expect(screen.getByText(/— of pass or fail results passed/)).toBeTruthy();
  });
  it('explains when an older snapshot has no saved case-level detail', () => {
    const { cases: _cases, ...legacy } = base;
    render(<ReportView report={legacy} />);
    expect(screen.getByText(/older signed snapshot contains summary counts only/)).toBeTruthy();
  });
});
