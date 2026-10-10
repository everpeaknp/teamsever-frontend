import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReportView } from './ReportView';

const base = {
  plan: { id: 'p1', name: 'Release 1' }, latestRun: null, runIds: [], generatedAt: '2026-10-10T00:00:00.000Z',
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
  });
  it('uses an em dash for a zero-denominator pass rate', () => {
    render(<ReportView report={{ ...base, passRate: { numerator: 0, denominator: 0, percent: null } }} />);
    expect(screen.getByText(/— of pass or fail results passed/)).toBeTruthy();
  });
});
