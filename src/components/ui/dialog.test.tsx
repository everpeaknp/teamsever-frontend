import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';

describe('DialogContent responsive sizing', () => {
  it('keeps dialog content inside a phone viewport and scrollable when tall', () => {
    render(<Dialog open><DialogContent><DialogTitle>Long form</DialogTitle><DialogDescription>Responsive test dialog</DialogDescription><div>Content</div></DialogContent></Dialog>);
    expect(screen.getByRole('dialog')).toHaveClass('w-[calc(100vw-1rem)]', 'max-h-[calc(100dvh-1rem)]', 'overflow-y-auto');
  });
});
