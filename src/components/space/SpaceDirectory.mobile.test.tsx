import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpaceDirectory } from './SpaceDirectory';

describe('SpaceDirectory', () => {
  it('shows every workspace space as a separate destination', () => {
    render(
      <SpaceDirectory
        workspaceId="ws1"
        workspaceName="Workspace"
        spaces={[
          { _id: 'space1', name: 'Marketing', folders: [], lists: [] },
          { _id: 'space2', name: 'Engineering', folders: [], lists: [] },
        ]}
      />,
    );

    expect(screen.getByRole('link', { name: /Marketing/ })).toHaveAttribute('href', '/workspace/ws1/spaces/space1');
    expect(screen.getByRole('link', { name: /Engineering/ })).toHaveAttribute('href', '/workspace/ws1/spaces/space2');
  });

  it('explains when a workspace has no spaces yet', () => {
    render(<SpaceDirectory workspaceId="ws1" spaces={[]} />);

    expect(screen.getByRole('heading', { name: 'No spaces yet' })).toBeInTheDocument();
  });

  it('shows a retry action after a load error', () => {
    const onRetry = vi.fn();
    render(<SpaceDirectory workspaceId="ws1" spaces={[]} error="Network error" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load spaces');
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
