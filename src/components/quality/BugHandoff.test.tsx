import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BugHandoff } from './BugHandoff';

const apiMocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/lib/axios', () => ({ api: apiMocks }));

// Radix Select uses pointer capture, which jsdom does not implement.
if (!HTMLElement.prototype.hasPointerCapture) HTMLElement.prototype.hasPointerCapture = () => false;
if (!HTMLElement.prototype.setPointerCapture) HTMLElement.prototype.setPointerCapture = () => {};
if (!HTMLElement.prototype.releasePointerCapture) HTMLElement.prototype.releasePointerCapture = () => {};
if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};

describe('BugHandoff verification', () => {
  beforeEach(() => {
    apiMocks.get.mockImplementation((url: string) => url.includes('/capabilities')
      ? Promise.resolve({ data: { data: { qualityEnabled: true, canVerifyBug: true } } })
      : Promise.resolve({ data: { data: { canVerify: true, retests: [{
        _id: 'execution-pass-1', caseKey: 'TC-003', snapshot: { title: 'Google sign-in' },
        run: { build: '1.0.2', environment: 'Staging', platform: 'Web' },
      }] } } }));
    apiMocks.post.mockResolvedValue({ data: { success: true } });
  });

  it('requires and submits a linked passing retest when verifying', async () => {
    render(<BugHandoff taskId="bug-1" workspaceId="workspace-1" listId="list-1" status="review" onChanged={() => {}} />);

    const verify = await screen.findByRole('button', { name: 'Verify fix' });
    expect(verify).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Passing retest' }), { key: ' ' });
    expect(await screen.findByRole('option', { name: /TC-003.*Google sign-in.*1.0.2.*Staging/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /TC-003.*Google sign-in.*1.0.2.*Staging/ }));
    expect(verify).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Verification note'), { target: { value: 'Passed on staging build 1.0.2' } });
    fireEvent.click(verify);

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/tasks/bug-1/quality-transition', expect.objectContaining({
      action: 'verify', executionId: 'execution-pass-1', reason: 'Passed on staging build 1.0.2',
    })));
  });

  it('explains when the current user handled the fix and cannot verify it', async () => {
    apiMocks.get.mockImplementation((url: string) => url.includes('/capabilities')
      ? Promise.resolve({ data: { data: { qualityEnabled: true, canVerifyBug: true } } })
      : Promise.resolve({ data: { data: { canVerify: false, verificationBlockedReason: 'The person who handled the fix cannot verify it', retests: [] } } }));
    render(<BugHandoff taskId="bug-1" workspaceId="workspace-1" listId="list-1" status="review" onChanged={() => {}} />);
    expect(await screen.findByText(/person who handled the fix cannot verify it/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify fix' })).toBeDisabled();
  });

  it('lets a verifier link an available passing result from the bug sidebar', async () => {
    apiMocks.get.mockImplementation((url: string) => url.includes('/capabilities')
      ? Promise.resolve({ data: { data: { qualityEnabled: true, canVerifyBug: true } } })
      : Promise.resolve({ data: { data: {
        canVerify: true,
        retests: [],
        availableRetests: [{ _id: 'execution-pass-2', caseKey: 'TC-002', snapshot: { title: 'Valid credentials' }, run: { build: '1.0.2', environment: 'Staging' } }],
      } } }));

    render(<BugHandoff taskId="bug-1" workspaceId="workspace-1" listId="list-1" status="review" onChanged={() => {}} />);

    fireEvent.keyDown(await screen.findByRole('combobox', { name: 'Link a passing result' }), { key: ' ' });
    fireEvent.click(await screen.findByRole('option', { name: /TC-002.*Valid credentials.*1.0.2.*Staging/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Link passing retest' }));
    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/tasks/bug-1/quality-retests/execution-pass-2'));
    expect(await screen.findByRole('status')).toHaveTextContent('Passing retest linked.');
  });
});
