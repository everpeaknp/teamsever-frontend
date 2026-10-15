import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreateChannelModal } from './CreateChannelModal';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

describe('CreateChannelModal mobile actions', () => {
  it('adds visible separation between the stacked create and cancel buttons', () => {
    render(
      <CreateChannelModal
        isOpen
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        workspaceId="workspace-1"
      />
    );

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel.parentElement).toHaveClass('gap-3', 'sm:gap-2', 'sm:space-x-0');
  });
});
