import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BugForm } from './BugForm';

describe('BugForm', () => {
  it('requires reproduction, expected result, actual result and environment', async () => {
    const onSubmit = vi.fn();
    render(<BugForm onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'Sign-in fails' } });
    fireEvent.click(screen.getByRole('button', { name: 'Report bug' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Describe how to reproduce the issue.')).toBeTruthy();
  });

  it('submits a complete bug at Open with separate severity and priority', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BugForm onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Summary'), { target: { value: 'Sign-in fails' } });
    fireEvent.change(screen.getByLabelText('Steps to reproduce'), { target: { value: '1. Open login\n2. Click Google' } });
    fireEvent.change(screen.getByLabelText('Expected result'), { target: { value: 'Dashboard opens' } });
    fireEvent.change(screen.getByLabelText('Actual result'), { target: { value: 'Error appears' } });
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'Chrome on Windows' } });
    fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'critical' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: 'Report bug' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      workItemType: 'bug', title: 'Sign-in fails', status: 'todo', priority: 'high',
      bugDetails: expect.objectContaining({ reproductionSteps: '1. Open login\n2. Click Google', expectedResult: 'Dashboard opens', actualResult: 'Error appears', severity: 'critical', environment: 'Chrome on Windows' }),
    })));
  });
});
