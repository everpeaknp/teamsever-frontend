import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QualityProjectHeader } from './QualityProjectHeader';

const mocks = vi.hoisted(() => ({ selectProject: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'workspace-1' }), useRouter: () => ({ push: mocks.push }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [], isLoading: false, isError: false }), useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock('@/lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/store/useAuthStore', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/components/quality/QualityProjectContext', () => ({ useQualityProject: () => ({
  projects: [{ _id: 'project-1', name: 'Mobile QA', scopeType: 'folder', folder: { name: 'Very long folder name used to verify it stays clipped inside the screen' } }],
  project: { _id: 'project-1', name: 'Mobile QA', scopeType: 'folder', folder: { name: 'Very long folder name used to verify it stays clipped inside the screen' } },
  projectId: 'project-1', hydrated: true, loading: false, error: null, retry: vi.fn(), selectProject: mocks.selectProject,
}) }));

describe('QualityProjectHeader phone layout', () => {
  beforeEach(() => { window.innerWidth = 320; });

  it('stacks scope and actions at 320px without a fixed-width control forcing page overflow', () => {
    render(<QualityProjectHeader />);
    const header = screen.getByTestId('quality-project-header');
    const scope = screen.getByRole('combobox', { name: 'Quality scope' });
    expect(header.firstElementChild).toHaveClass('flex-col');
    expect(scope).toHaveClass('w-full', 'min-w-0', 'max-w-full');
    expect(scope.className).not.toContain('min-w-56');
    expect(screen.getByRole('button', { name: /Create folder project/ })).toHaveClass('w-full');
    expect(screen.getByRole('button', { name: 'QA settings' })).toHaveClass('w-full');
  });
});
