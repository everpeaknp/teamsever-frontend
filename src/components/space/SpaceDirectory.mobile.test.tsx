import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpaceDirectory } from './SpaceDirectory';
import { SpaceTabNavigation } from './SpaceTabNavigation';

describe('SpaceDirectory', () => {
  it('keeps all space sections available as touch-sized tabs at 320px', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    const onChange = vi.fn();
    render(<SpaceTabNavigation activeTab="lists" onChange={onChange} tableCount={2} />);

    expect(screen.getByRole('tablist', { name: 'Space sections' })).toHaveClass('grid-cols-3');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.querySelector('span')?.textContent)).toEqual(['Lists', 'Tables', 'Commits']);
    tabs.forEach((tab) => expect(tab).toHaveClass('min-h-11'));

    fireEvent.click(screen.getByRole('tab', { name: /Tables/ }));
    expect(onChange).toHaveBeenCalledWith('tables');
  });

  it('keeps space cards inside a single-column 320px mobile layout', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    render(
      <SpaceDirectory
        workspaceId="ws1"
        spaces={[{ _id: 'space1', name: 'A very long space name that should wrap', description: 'A long description that should wrap inside the card without widening the page.' }]}
      />,
    );

    const card = screen.getByRole('link', { name: /A very long space name/ });
    expect(card).toHaveClass('min-w-0');
    expect(card).toHaveClass('min-h-0');
    expect(card).toHaveClass('sm:min-h-40');
    expect(card.parentElement).toHaveClass('sm:grid-cols-2');
    expect(card.textContent).toContain('A long description');
    expect(card.querySelector('svg.lucide-chevron-right')).toBeInTheDocument();
  });

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

  it('gives spaces distinct accents and omits repeated filler descriptions', () => {
    render(
      <SpaceDirectory
        workspaceId="ws1"
        spaces={[
          { _id: 'space1', name: 'Marketing', folders: [], lists: [] },
          { _id: 'space2', name: 'Engineering', folders: [], lists: [] },
        ]}
      />,
    );

    const marketing = screen.getByRole('link', { name: /Marketing/ });
    const engineering = screen.getByRole('link', { name: /Engineering/ });
    expect(marketing).not.toHaveTextContent('Open this space to browse its work.');
    expect(engineering).not.toHaveTextContent('Open this space to browse its work.');
    const marketingIcon = marketing.querySelector<HTMLElement>('.space-icon');
    const engineeringIcon = engineering.querySelector<HTMLElement>('.space-icon');
    expect(marketingIcon?.style.color).toBeTruthy();
    expect(marketingIcon?.style.color).not.toEqual(engineeringIcon?.style.color);
  });

  it('shows a create-space action for users with permission and opens the shared modal', () => {
    const onCreateSpace = vi.fn();
    render(
      <SpaceDirectory
        workspaceId="ws1"
        spaces={[]}
        canCreateSpace
        onCreateSpace={onCreateSpace}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /create space/i })[0]);
    expect(onCreateSpace).toHaveBeenCalledOnce();
  });

  it('does not show a create-space action without permission', () => {
    render(<SpaceDirectory workspaceId="ws1" spaces={[]} />);

    expect(screen.queryByRole('button', { name: /create space/i })).not.toBeInTheDocument();
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
