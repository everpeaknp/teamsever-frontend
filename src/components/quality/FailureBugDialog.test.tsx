import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FailureBugDialog } from './FailureBugDialog';

describe('FailureBugDialog', () => {
  it('offers only an existing bug for a passing retest', () => {
    render(<FailureBugDialog lists={[]} bugs={[{ id: 'bug-1', title: 'Login fails', status: 'inprogress', listLabel: 'Yummy / Bugs' }]} allowNew={false} onCreate={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: 'Existing bugs' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Login fails.*in progress.*Yummy \/ Bugs/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New bug' })).toBeNull();
  });
  it('links the selected existing bug without asking for a record ID', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<FailureBugDialog lists={[]} bugs={[{ id: 'bug-1', title: 'Login fails', status: 'todo', listLabel: 'Yummy / Bugs' }]} allowNew={false} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('radio', { name: /Login fails/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Link bug' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ existingBugId: 'bug-1' })));
  });
  it('submits optional assignee and target fix date for a new bug', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<FailureBugDialog lists={[{ id: 'list-1', label: 'Yummy / Bugs' }]} members={[{ id: 'user-1', label: 'Developer · dev@example.com' }]} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Target list'), { target: { value: 'list-1' } });
    fireEvent.change(screen.getByLabelText('Assignee (optional)'), { target: { value: 'user-1' } });
    fireEvent.change(screen.getByLabelText('Target fix date (optional)'), { target: { value: '2026-10-20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create linked bug' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ assigneeId: 'user-1', dueDate: '2026-10-20' })));
  });
  it('retries with the same idempotency key after a network error', async () => {
    const onCreate = vi.fn().mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(undefined);
    render(<FailureBugDialog lists={[{ id: 'list-1', label: 'Product backlog' }]} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Target list'), { target: { value: 'list-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create linked bug' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Create linked bug' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(2));
    expect(onCreate.mock.calls[0][0].idempotencyKey).toBe(onCreate.mock.calls[1][0].idempotencyKey);
  });
});
