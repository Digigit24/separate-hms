// src/components/admin-settings/CurrencySettingsTab.tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { IndianRupee } from 'lucide-react';

interface CurrencySettings {
  currency_code: string;
  currency_symbol: string;
  currency_name: string;
  currency_decimals: number;
  currency_thousand_separator: string;
  currency_decimal_separator: string;
  currency_symbol_position: 'before' | 'after';
  currency_use_indian_numbering: boolean;
}

interface CurrencySettingsTabProps {
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  currencyDecimals: number;
  currencyThousandSeparator: string;
  currencyDecimalSeparator: string;
  currencySymbolPosition: 'before' | 'after';
  currencyUseIndianNumbering: boolean;
  onCurrencyCodeChange: (value: string) => void;
  onCurrencySymbolChange: (value: string) => void;
  onCurrencyNameChange: (value: string) => void;
  onCurrencyDecimalsChange: (value: number) => void;
  onCurrencyThousandSeparatorChange: (value: string) => void;
  onCurrencyDecimalSeparatorChange: (value: string) => void;
  onCurrencySymbolPositionChange: (value: 'before' | 'after') => void;
  onCurrencyUseIndianNumberingChange: (value: boolean) => void;
}

// Predefined currency options
const CURRENCY_OPTIONS = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

export const CurrencySettingsTab: React.FC<CurrencySettingsTabProps> = ({
  currencyCode,
  currencySymbol,
  currencyName,
  currencyDecimals,
  currencyThousandSeparator,
  currencyDecimalSeparator,
  currencySymbolPosition,
  currencyUseIndianNumbering,
  onCurrencyCodeChange,
  onCurrencySymbolChange,
  onCurrencyNameChange,
  onCurrencyDecimalsChange,
  onCurrencyThousandSeparatorChange,
  onCurrencyDecimalSeparatorChange,
  onCurrencySymbolPositionChange,
  onCurrencyUseIndianNumberingChange,
}) => {
  // Handle predefined currency selection
  const handleCurrencySelect = (code: string) => {
    const currency = CURRENCY_OPTIONS.find(c => c.code === code);
    if (currency) {
      onCurrencyCodeChange(currency.code);
      onCurrencySymbolChange(currency.symbol);
      onCurrencyNameChange(currency.name);

      // Set default formatting for Indian Rupee
      if (currency.code === 'INR') {
        onCurrencyUseIndianNumberingChange(true);
      }
    }
  };

  // Format preview amount
  const formatPreview = () => {
    const amount = 123456.78;
    let formatted = amount.toFixed(currencyDecimals);
    const [integerPart, decimalPart] = formatted.split('.');

    let formattedInteger = '';

    if (currencyUseIndianNumbering && currencyCode === 'INR') {
      // Indian numbering system: last 3 digits, then groups of 2
      const length = integerPart.length;
      if (length <= 3) {
        formattedInteger = integerPart;
      } else {
        const lastThree = integerPart.substring(length - 3);
        const remaining = integerPart.substring(0, length - 3);
        formattedInteger = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, currencyThousandSeparator) + currencyThousandSeparator + lastThree;
      }
    } else {
      // Standard numbering: groups of 3
      formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, currencyThousandSeparator);
    }

    const finalAmount = decimalPart
      ? `${formattedInteger}${currencyDecimalSeparator}${decimalPart}`
      : formattedInteger;

    return currencySymbolPosition === 'before'
      ? `${currencySymbol}${finalAmount}`
      : `${finalAmount}${currencySymbol}`;
  };

  return (
    <div className="space-y-3">
      <Card className="border-border">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <IndianRupee className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">Currency Configuration</h3>
              <p className="text-[11px] text-muted-foreground">Configure the currency used throughout your application</p>
            </div>
          </div>

          {/* Quick Currency Selection */}
          <div className="space-y-1">
            <Label htmlFor="currency-select" className="text-[12px]">Select Currency</Label>
            <Select value={currencyCode} onValueChange={handleCurrencySelect}>
              <SelectTrigger id="currency-select" className="h-8 text-[12px]">
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code} className="text-[12px]">
                    {currency.symbol} {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currency Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="currency-code" className="text-[12px]">Code</Label>
              <Input
                id="currency-code"
                placeholder="INR"
                value={currencyCode}
                onChange={(e) => onCurrencyCodeChange(e.target.value)}
                className="h-8 text-[12px]"
              />
              <p className="text-[11px] text-muted-foreground">ISO 4217</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency-symbol" className="text-[12px]">Symbol</Label>
              <Input
                id="currency-symbol"
                placeholder="₹"
                value={currencySymbol}
                onChange={(e) => onCurrencySymbolChange(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency-name" className="text-[12px]">Name</Label>
              <Input
                id="currency-name"
                placeholder="Indian Rupee"
                value={currencyName}
                onChange={(e) => onCurrencyNameChange(e.target.value)}
                className="h-8 text-[12px]"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency-decimals" className="text-[12px]">Decimals</Label>
              <Select
                value={currencyDecimals.toString()}
                onValueChange={(value) => onCurrencyDecimalsChange(parseInt(value))}
              >
                <SelectTrigger id="currency-decimals" className="h-8 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0" className="text-[12px]">0</SelectItem>
                  <SelectItem value="2" className="text-[12px]">2</SelectItem>
                  <SelectItem value="3" className="text-[12px]">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Formatting Options */}
          <div className="pt-2 border-t border-border space-y-3">
            <h4 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Formatting</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="thousand-separator" className="text-[12px]">Thousands</Label>
                <Select
                  value={currencyThousandSeparator || "none"}
                  onValueChange={(value) => onCurrencyThousandSeparatorChange(value === "none" ? "" : value)}
                >
                  <SelectTrigger id="thousand-separator" className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="," className="text-[12px]">Comma (,)</SelectItem>
                    <SelectItem value="." className="text-[12px]">Period (.)</SelectItem>
                    <SelectItem value=" " className="text-[12px]">Space ( )</SelectItem>
                    <SelectItem value="none" className="text-[12px]">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="decimal-separator" className="text-[12px]">Decimal</Label>
                <Select
                  value={currencyDecimalSeparator}
                  onValueChange={onCurrencyDecimalSeparatorChange}
                >
                  <SelectTrigger id="decimal-separator" className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="." className="text-[12px]">Period (.)</SelectItem>
                    <SelectItem value="," className="text-[12px]">Comma (,)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="symbol-position" className="text-[12px]">Position</Label>
                <Select
                  value={currencySymbolPosition}
                  onValueChange={(value) => onCurrencySymbolPositionChange(value as 'before' | 'after')}
                >
                  <SelectTrigger id="symbol-position" className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before" className="text-[12px]">Before ({currencySymbol}100)</SelectItem>
                    <SelectItem value="after" className="text-[12px]">After (100{currencySymbol})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="indian-numbering" className="text-[12px]">Indian Numbering</Label>
                  <p className="text-[11px] text-muted-foreground">
                    1,00,000
                  </p>
                </div>
                <Switch
                  id="indian-numbering"
                  checked={currencyUseIndianNumbering}
                  onCheckedChange={onCurrencyUseIndianNumberingChange}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Preview Card */}
      <Card className="border-border">
        <div className="p-4 space-y-3">
          <h3 className="text-[13px] font-semibold text-foreground">Preview</h3>
          <div className="flex items-center justify-between p-3 border rounded-lg bg-neutral-50 dark:bg-neutral-900">
            <span className="text-[12px] text-muted-foreground">Sample (123456.78):</span>
            <span className="text-lg font-bold text-foreground">{formatPreview()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-muted-foreground">Currency</p>
              <p className="text-[12px] font-medium">{currencySymbol} {currencyCode}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Format</p>
              <p className="text-[12px] font-medium">
                {currencyUseIndianNumbering ? 'Indian Numbering' : 'Standard Numbering'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
