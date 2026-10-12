import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExecutionPlayer } from './ExecutionPlayer';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) } }));
vi.mock('@/components/quality/QualityProjectContext', () => ({ useQualityProject: () => ({ projectId: 'quality-project' }) }));

const execution = {
  _id: 'execution-1', run: 'run-1', testCase: 'case-1', caseKey: 'TC-014', revision: 3,
  snapshot: { title: 'Google sign-in', steps: [{ action: 'Open login', expectedResult: 'Form appears' }] },
  result: 'not_run' as const, version: 1,
};

describe('ExecutionPlayer', () => {
  it('requires a reason for a failed result and preserves input after conflict', async () => {
    const onSave = vi.fn().mockRejectedValue({ response: { status: 409 } });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ExecutionPlayer workspaceId="workspace" execution={execution} onSave={onSave} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText('Step 1 result'), { target: { value: 'fail' } });
    fireEvent.change(screen.getByLabelText('Overall result'), { target: { value: 'fail' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save result' }));
    expect(screen.getByRole('alert').textContent).toContain('reason');
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Wrong screen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save result' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed'));
    expect((screen.getByLabelText('Reason') as HTMLTextAreaElement).value).toBe('Wrong screen');
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 1, result: 'fail', reason: 'Wrong screen', stepResults: [{ result: 'fail', actualResult: '' }] }));
  });
});
