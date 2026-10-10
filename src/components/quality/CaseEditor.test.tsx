import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CaseEditor } from './CaseEditor';

const existing = {
  _id: 'case-1', key: 'TC-014', title: 'Google sign-in', currentRevision: 2,
  state: 'active' as const, priority: 'medium' as const, type: 'manual' as const,
  steps: [{ action: 'Open sign-in', expectedResult: 'Form appears' }],
};

describe('CaseEditor', () => {
  it('keeps edited text visible when another author wins the revision race', async () => {
    const onSave = vi.fn().mockRejectedValue({ response: { status: 409 } });
    render(<CaseEditor value={existing} onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Case title'), { target: { value: 'Google sign-in on Android' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save case' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('changed'));
    expect((screen.getByLabelText('Case title') as HTMLInputElement).value).toBe('Google sign-in on Android');
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Google sign-in on Android' }), 2);
  });

  it('adds ordered steps before saving a new case', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CaseEditor onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('Case title'), { target: { value: 'Password reset' } });
    fireEvent.change(screen.getByLabelText('Step 1 action'), { target: { value: 'Open reset' } });
    fireEvent.change(screen.getByLabelText('Step 1 expected result'), { target: { value: 'Reset form appears' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add step' }));
    fireEvent.change(screen.getByLabelText('Step 2 action'), { target: { value: 'Submit email' } });
    fireEvent.change(screen.getByLabelText('Step 2 expected result'), { target: { value: 'Email sent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save case' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Password reset', steps: [{ action: 'Open reset', expectedResult: 'Reset form appears', testData: '' }, { action: 'Submit email', expectedResult: 'Email sent', testData: '' }],
    }), undefined));
  });
});
