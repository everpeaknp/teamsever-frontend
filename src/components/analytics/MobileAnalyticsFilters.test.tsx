import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileAnalyticsFilters } from './MobileAnalyticsFilters';

const defaultProps = {
  range: '30d' as const,
  onRangeChange: vi.fn(),
  availableViews: ['workspace', 'personal'] as const,
  selectedView: 'workspace' as const,
  onViewChange: vi.fn(),
  customFrom: '',
  customTo: '',
  onCustomFromChange: vi.fn(),
  onCustomToChange: vi.fn(),
};

describe('MobileAnalyticsFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  });

  it('uses compact app-styled selectors instead of native select menus', () => {
    const { container } = render(<MobileAnalyticsFilters {...defaultProps} />);

    expect(container.querySelector('select')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Date range' })).toHaveTextContent('30 days');
    expect(screen.getByRole('combobox', { name: 'Analytics view' })).toHaveTextContent('Workspace view');
  });

  it('changes the selected date range from the app menu', async () => {
    render(<MobileAnalyticsFilters {...defaultProps} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Date range' }));
    fireEvent.click(await screen.findByRole('option', { name: '90 days' }));

    expect(defaultProps.onRangeChange).toHaveBeenCalledWith('90d');
  });

  it('shows custom date fields only for a custom range', () => {
    const { rerender } = render(<MobileAnalyticsFilters {...defaultProps} />);

    expect(screen.queryByLabelText('From date')).not.toBeInTheDocument();
    rerender(<MobileAnalyticsFilters {...defaultProps} range="custom" />);

    expect(screen.getByLabelText('From date')).toBeInTheDocument();
    expect(screen.getByLabelText('To date')).toBeInTheDocument();
  });
});
