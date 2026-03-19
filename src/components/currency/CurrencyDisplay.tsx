'use client';

import { useCurrency } from '@/contexts/CurrencyContext';

interface CurrencyDisplayProps {
  amount: number;
  baseCurrency: 'USD' | 'NPR';
  className?: string;
  showCurrencyCode?: boolean;
}

export function CurrencyDisplay({
  amount,
  baseCurrency,
  className = '',
  showCurrencyCode = true
}: CurrencyDisplayProps) {
  const { currency: userCurrency, exchangeRate } = useCurrency();

  // Calculate displayed amount
  let displayAmount = amount;
  let displayCurrency = baseCurrency;

  if (baseCurrency !== userCurrency) {
    displayCurrency = userCurrency;
    
    if (baseCurrency === 'USD' && userCurrency === 'NPR') {
      // Convert USD to NPR
      displayAmount = amount * exchangeRate;
    } else if (baseCurrency === 'NPR' && userCurrency === 'USD') {
      // Convert NPR to USD
      displayAmount = amount / exchangeRate;
    }
  }

  // Format the amount using Intl.NumberFormat
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    minimumFractionDigits: displayCurrency === 'NPR' ? 0 : 2,
    maximumFractionDigits: displayCurrency === 'NPR' ? 0 : 2,
  }).format(displayAmount);

  // For NPR, replace the currency symbol with "Rs. "
  const finalDisplay = displayCurrency === 'NPR' 
    ? formatted.replace('NPR', 'Rs.').replace(/\s+/g, ' ')
    : formatted;

  return (
    <span className={className}>
      {finalDisplay}
    </span>
  );
}

// Compact version for small spaces
export function CurrencyDisplayCompact({
  amount,
  baseCurrency,
  className = ''
}: Omit<CurrencyDisplayProps, 'showCurrencyCode'>) {
  const { currency: userCurrency, exchangeRate } = useCurrency();

  let displayAmount = amount;
  let symbol = baseCurrency === 'USD' ? '$' : 'Rs.';

  if (baseCurrency !== userCurrency) {
    symbol = userCurrency === 'USD' ? '$' : 'Rs.';
    
    if (baseCurrency === 'USD' && userCurrency === 'NPR') {
      displayAmount = amount * exchangeRate;
    } else if (baseCurrency === 'NPR' && userCurrency === 'USD') {
      displayAmount = amount / exchangeRate;
    }
  }

  const formatted = userCurrency === 'NPR'
    ? Math.round(displayAmount).toLocaleString('en-US')
    : displayAmount.toFixed(2);

  return (
    <span className={className}>
      {symbol} {formatted}
    </span>
  );
}
