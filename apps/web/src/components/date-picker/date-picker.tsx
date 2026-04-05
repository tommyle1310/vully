'use client';

import * as React from 'react';
import { format, parse, isValid, getYear, getMonth, setMonth, setYear } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import { buttonVariants } from '@/components/ui/button';

interface DatePickerProps {
  /** The selected date */
  value?: Date;
  /** Callback when date changes */
  onChange?: (date: Date | undefined) => void;
  /** Placeholder text when no date selected */
  placeholder?: string;
  /** Disable the date picker */
  disabled?: boolean;
  /** Custom date format string (date-fns format) */
  dateFormat?: string;
  /** Additional className for the trigger button */
  className?: string;
  /** Minimum selectable date */
  fromDate?: Date;
  /** Maximum selectable date */
  toDate?: Date;
  /** ID for the button element */
  id?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Generate year range (50 years before and after current year)
function getYearRange(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 50; y <= currentYear + 50; y++) {
    years.push(y);
  }
  return years;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  dateFormat = 'dd/MM/yyyy',
  className,
  fromDate,
  toDate,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [displayMonth, setDisplayMonth] = React.useState<Date>(value || new Date());
  
  const years = React.useMemo(() => getYearRange(), []);

  // Sync input value with selected date
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, 'dd/MM/yyyy'));
      setDisplayMonth(value);
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date);
    if (date) {
      setInputValue(format(date, 'dd/MM/yyyy'));
      setDisplayMonth(date);
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Try to parse the date (dd/MM/yyyy format)
    if (val.length === 10) {
      const parsed = parse(val, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) {
        // Check date bounds
        if (fromDate && parsed < fromDate) return;
        if (toDate && parsed > toDate) return;
        onChange?.(parsed);
        setDisplayMonth(parsed);
      }
    } else if (val === '') {
      onChange?.(undefined);
    }
  };

  const handleInputBlur = () => {
    // On blur, revert to the selected value if input is invalid
    if (value) {
      setInputValue(format(value, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
  };

  const handleMonthChange = (month: string) => {
    const newDate = setMonth(displayMonth, parseInt(month, 10));
    setDisplayMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = setYear(displayMonth, parseInt(year, 10));
    setDisplayMonth(newDate);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setDisplayMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setDisplayMonth(newDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, dateFormat) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-3">
          {/* Manual input */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="dd/mm/yyyy"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className="h-8 text-sm"
              maxLength={10}
            />
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              <Select
                value={String(getMonth(displayMonth))}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="h-7 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={month} value={String(idx)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(getYear(displayMonth))}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="h-7 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar */}
          <DayPicker
            mode="single"
            selected={value}
            onSelect={handleSelect}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            showOutsideDays
            className="p-0"
            classNames={{
              months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
              month: 'space-y-4',
              month_caption: 'hidden', // We use custom navigation
              nav: 'hidden', // We use custom navigation
              month_grid: 'w-full border-collapse space-y-1',
              weekdays: 'flex',
              weekday: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
              week: 'flex w-full mt-2',
              day: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
              day_button: cn(
                buttonVariants({ variant: 'ghost' }),
                'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
              ),
              range_end: 'day-range-end',
              selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
              today: 'bg-accent text-accent-foreground',
              outside: 'day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
              disabled: 'text-muted-foreground opacity-50',
              range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
              hidden: 'invisible',
            }}
            fromDate={fromDate}
            toDate={toDate}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
