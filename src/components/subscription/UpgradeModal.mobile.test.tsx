import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UpgradeModal from './UpgradeModal';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('UpgradeModal responsive layout', () => {
  it('keeps the dialog within the mobile viewport and stacks its actions', () => {
    render(
      <UpgradeModal
        isOpen
        onClose={vi.fn()}
        reason="workspace"
        maxAllowed={1}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('w-[calc(100vw-2rem)]', 'max-w-md');

    const maybeLater = screen.getByRole('button', { name: /maybe later/i });
    expect(maybeLater.parentElement).toHaveClass('flex-col', 'sm:flex-row');
  });
});
