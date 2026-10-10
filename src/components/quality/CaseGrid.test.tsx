import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseGrid } from './CaseGrid';

const data = [{ _id: 'case-1', key: 'TC-014', title: 'Google sign-in', state: 'active' as const, priority: 'high' as const, type: 'manual' as const, currentRevision: 2, steps: [{ action: 'Open', expectedResult: 'Visible' }] }];

describe('CaseGrid', () => {
  it('shows server pagination and opens the selected case', () => {
    const onPageChange = vi.fn();
    const onOpen = vi.fn();
    render(<CaseGrid cases={data} page={2} limit={10} total={21} onPageChange={onPageChange} onOpen={onOpen} />);
    expect(screen.getByText('11–20 of 21')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Google sign-in/ }));
    expect(onOpen).toHaveBeenCalledWith(data[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('keeps a quick edit visible when the revision conflicts', async () => {
    const onQuickSave = vi.fn().mockRejectedValue({ response: { status: 409 } });
    render(<CaseGrid cases={data} page={1} limit={10} total={1} onPageChange={() => {}} onOpen={() => {}} onQuickSave={onQuickSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit row' }));
    fireEvent.change(screen.getByLabelText('Case title'), { target: { value: 'Google sign-in on Android' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed'));
    expect((screen.getByLabelText('Case title') as HTMLInputElement).value).toBe('Google sign-in on Android');
    expect(onQuickSave).toHaveBeenCalledWith(data[0], { title: 'Google sign-in on Android', priority: 'high', state: 'active' });
  });
});
