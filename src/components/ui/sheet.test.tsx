import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Sheet, SheetContent, SheetTitle } from './sheet';

describe('SheetContent responsive sizing', () => {
  it('keeps tall sheet content scrollable within a phone viewport', () => {
    render(<Sheet open><SheetContent><SheetTitle>Details</SheetTitle><div>Content</div></SheetContent></Sheet>);
    expect(screen.getByRole('dialog')).toHaveClass('max-h-[100dvh]', 'overflow-y-auto', 'overscroll-contain');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('h-11', 'w-11');
  });
});
