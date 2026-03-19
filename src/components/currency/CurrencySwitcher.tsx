'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign } from 'lucide-react';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={(value: 'USD' | 'NPR') => setCurrency(value)}>
      <SelectTrigger className="w-[120px]">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NPR">
          <div className="flex items-center gap-2">
            <span className="font-medium">NPR</span>
            <span className="text-xs text-muted-foreground">रू</span>
          </div>
        </SelectItem>
        <SelectItem value="USD">
          <div className="flex items-center gap-2">
            <span className="font-medium">USD</span>
            <span className="text-xs text-muted-foreground">$</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// Compact version for navbar
export function CurrencySwitcherCompact() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={(value: 'USD' | 'NPR') => setCurrency(value)}>
      <SelectTrigger className="w-[90px] h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="NPR">NPR रू</SelectItem>
        <SelectItem value="USD">USD $</SelectItem>
      </SelectContent>
    </Select>
  );
}
