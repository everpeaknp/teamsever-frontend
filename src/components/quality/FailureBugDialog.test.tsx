import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FailureBugDialog } from './FailureBugDialog';

describe('FailureBugDialog', () => {
  it('offers only an existing bug for a passing retest', () => {
    render(<FailureBugDialog lists={[]} allowNew={false} onCreate={vi.fn()} />);
    expect(screen.getByLabelText('Existing bug ID')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'New bug' })).toBeNull();
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
