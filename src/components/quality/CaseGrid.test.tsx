import { fireEvent, render, screen } from '@testing-library/react';
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
});
