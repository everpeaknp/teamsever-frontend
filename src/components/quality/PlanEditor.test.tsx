import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlanEditor } from './PlanEditor';

const first = { _id: 'one', key: 'TC-001', title: 'Sign in' };
const second = { _id: 'two', key: 'TC-002', title: 'Reset password' };

describe('PlanEditor', () => {
  it('keeps selections while browsing another server page', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const view = render(<PlanEditor cases={[first]} page={1} total={2} limit={1} onPageChange={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /TC-001/ }));
    view.rerender(<PlanEditor cases={[second]} page={2} total={2} limit={1} onPageChange={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /TC-002/ }));
    fireEvent.change(screen.getByLabelText('Plan name'), { target: { value: 'October release' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ name: 'October release', description: '', caseIds: ['one', 'two'] }));
  });
});
