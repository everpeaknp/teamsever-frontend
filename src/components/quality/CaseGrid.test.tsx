import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseGrid } from './CaseGrid';

const data = [{ _id: 'case-1', key: 'TC-014', title: 'Google sign-in', state: 'active' as const, priority: 'high' as const, type: 'manual' as const, currentRevision: 2, steps: [{ action: 'Open', expectedResult: 'Visible' }] }];

describe('CaseGrid', () => {
  it('provides a compact phone card list without requiring horizontal table scrolling', () => {
    render(<CaseGrid cases={data} page={1} limit={10} total={1} onPageChange={() => {}} onOpen={() => {}} />);
    expect(screen.getByTestId('case-mobile-list')).toBeInTheDocument();
  });

  it('wraps long case titles inside the phone card', () => {
    const longTitle = 'G'.repeat(160);
    render(<CaseGrid cases={[{ ...data[0], title: longTitle }]} page={1} limit={10} total={1} onPageChange={() => {}} onOpen={() => {}} />);
    expect(within(screen.getByTestId('case-mobile-list')).getByRole('button', { name: longTitle })).toHaveClass('break-words');
  });

  it('shows server pagination and opens the selected case', () => {
    const onPageChange = vi.fn();
    const onOpen = vi.fn();
    render(<CaseGrid cases={data} page={2} limit={10} total={21} onPageChange={onPageChange} onOpen={onOpen} />);
    expect(screen.getByText('11–20 of 21')).toBeTruthy();
    fireEvent.click(within(screen.getByTestId('case-mobile-list')).getByRole('button', { name: /Google sign-in/ }));
    expect(onOpen).toHaveBeenCalledWith(data[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('keeps a quick edit visible when the revision conflicts', async () => {
    const onQuickSave = vi.fn().mockRejectedValue({ response: { status: 409 } });
    render(<CaseGrid cases={data} page={1} limit={10} total={1} onPageChange={() => {}} onOpen={() => {}} onQuickSave={onQuickSave} />);
    const mobileList = within(screen.getByTestId('case-mobile-list'));
    fireEvent.click(mobileList.getByRole('button', { name: 'Edit row' }));
    fireEvent.change(mobileList.getByLabelText('Case title'), { target: { value: 'Google sign-in on Android' } });
    fireEvent.click(mobileList.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed'));
    expect((mobileList.getByLabelText('Case title') as HTMLInputElement).value).toBe('Google sign-in on Android');
    expect(onQuickSave).toHaveBeenCalledWith(data[0], { title: 'Google sign-in on Android', priority: 'high', state: 'active' });
  });
});
