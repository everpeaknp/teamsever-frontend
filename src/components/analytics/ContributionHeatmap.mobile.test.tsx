import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContributionHeatmap } from './ContributionHeatmap';
import { api } from '@/lib/axios';

vi.mock('@/lib/axios', () => ({ api: { get: vi.fn() } }));

describe('ContributionHeatmap mobile layout', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { dailyCounts: {}, currentStreak: 0, longestStreak: 3 } },
    });
  });

  it('stacks its toolbar on narrow screens so filters and streak badges do not overflow', async () => {
    render(<ContributionHeatmap userId="member-1" />);

    const title = await screen.findByText('Contribution Activity');
    const headerLayout = title.closest('.border-b')?.firstElementChild;

    expect(headerLayout).toHaveClass('flex-col');
    expect(headerLayout).toHaveClass('sm:flex-row');
  });
});
