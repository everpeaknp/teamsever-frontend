import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QualityBugList } from './QualityBugList';

const bug = {
  _id: 'bug-1',
  title: 'A'.repeat(180),
  status: 'inprogress',
  priority: 'high',
  bugDetails: { severity: 'critical', environment: 'A very narrow mobile environment label' },
  list: 'list-1',
  updatedAt: '2026-10-19T10:00:00.000Z',
};

describe('QualityBugList mobile layout', () => {
  it('keeps long bug content inside a phone card and preserves open and paging actions at 320px', () => {
    window.innerWidth = 320;
    const onOpen = vi.fn();
    const onPageChange = vi.fn();
    render(<QualityBugList bugs={[bug]} total={60} page={1} onPageChange={onPageChange} onOpen={onOpen} />);

    const list = screen.getByTestId('quality-bug-mobile-list');
    const title = within(list).getByRole('button', { name: bug.title });
    expect(title).toHaveClass('w-full', 'min-w-0', 'break-words');
    expect(within(list).getByText('in progress')).toBeInTheDocument();
    expect(within(list).getByText('critical')).toBeInTheDocument();
    fireEvent.click(title);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onOpen).toHaveBeenCalledWith('bug-1');
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
