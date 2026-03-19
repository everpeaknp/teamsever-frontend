'use client';

import { useCurrency } from '@/contexts/CurrencyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CurrencySwitcherDark() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={(value: 'USD' | 'NPR') => setCurrency(value)}>
      <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700 focus:ring-gray-600">
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700">
        <SelectItem 
          value="USD" 
          className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">$</span>
            <span>USD</span>
          </div>
        </SelectItem>
        <SelectItem 
          value="NPR" 
          className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">रू</span>
            <span>NPR</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
