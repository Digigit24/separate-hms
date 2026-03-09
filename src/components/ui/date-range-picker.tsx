// src/components/ui/date-range-picker.tsx
"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Pick a date range",
  className,
  align = "start",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    if (range?.from && range?.to) {
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateRangeChange(undefined);
  };

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onDateRangeChange({ from, to });
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    onDateRangeChange({ from: today, to: today });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal h-7 text-[12px] px-2.5 gap-1.5",
            !dateRange?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {dateRange?.from ? (
            dateRange.to ? (
              <span>
                {format(dateRange.from, "dd MMM yy")} - {format(dateRange.to, "dd MMM yy")}
              </span>
            ) : (
              <span>{format(dateRange.from, "dd MMM yy")} - ...</span>
            )
          ) : (
            <span>{placeholder}</span>
          )}
          {dateRange?.from && (
            <X
              className="h-3 w-3 shrink-0 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="flex gap-1 p-2 border-b flex-wrap">
          <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => handlePreset(7)}>
            Last 7 days
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => handlePreset(30)}>
            Last 30 days
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => handlePreset(90)}>
            Last 90 days
          </Button>
        </div>
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
