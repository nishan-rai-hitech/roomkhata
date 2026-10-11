"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BS_MONTHS,
  adToBs,
  bsToAd,
  daysInBsMonth,
  type BsDate,
} from "@/lib/bs";
import { cn, formatDate } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const YEARS = Array.from({ length: BS_MAX_YEAR - BS_MIN_YEAR + 1 }, (_, i) => BS_MIN_YEAR + i);

function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `iso` shifted by a number of days, as YYYY-MM-DD. */
function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** One Bikram Sambat month as a grid; days are reported back as AD YYYY-MM-DD. */
function BsCalendar({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (iso: string) => void;
}) {
  const today = localToday();
  const [view, setView] = useState<Pick<BsDate, "year" | "month">>(() => {
    const start = (value && adToBs(value)) || adToBs(today);
    return start ? { year: start.year, month: start.month } : { year: BS_MIN_YEAR, month: 1 };
  });

  const first = bsToAd({ ...view, day: 1 });
  const lead = first ? new Date(`${first}T00:00:00Z`).getUTCDay() : 0;
  const weeks = Math.ceil((lead + daysInBsMonth(view.year, view.month)) / 7);
  // Whole weeks, padded with the neighbouring months' days.
  const cells = first
    ? Array.from({ length: weeks * 7 }, (_, i) => {
        const iso = addDays(first, i - lead);
        return { iso, bs: adToBs(iso) };
      })
    : [];

  const atStart = view.year === BS_MIN_YEAR && view.month === 1;
  const atEnd = view.year === BS_MAX_YEAR && view.month === 12;

  function step(by: 1 | -1) {
    const index = view.year * 12 + (view.month - 1) + by;
    setView({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  }

  return (
    <div className="p-3">
      <div className="mb-3 flex items-center justify-between gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Previous month"
          disabled={atStart}
          onClick={() => step(-1)}
        >
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-1.5">
          <select
            aria-label="Month"
            className={selectClass}
            value={view.month}
            onChange={(e) => setView({ ...view, month: Number(e.target.value) })}
          >
            {BS_MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Year"
            className={selectClass}
            value={view.year}
            onChange={(e) => setView({ ...view, year: Number(e.target.value) })}
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Next month"
          disabled={atEnd}
          onClick={() => step(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-1 text-[0.8rem] text-muted-foreground select-none">
            {day}
          </div>
        ))}
        {cells.map(({ iso, bs }) =>
          bs ? (
            <button
              key={iso}
              type="button"
              // The AD date, for anyone cross-checking against an English calendar.
              title={new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
              aria-pressed={iso === value}
              onClick={() => onSelect(iso)}
              className={cn(
                "mx-auto flex size-9 items-center justify-center rounded-md text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
                bs.month !== view.month && "text-muted-foreground",
                iso === today && "bg-accent text-accent-foreground",
                iso === value &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {bs.day}
            </button>
          ) : (
            <span key={iso} />
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Bikram Sambat date picker. Values stay plain AD YYYY-MM-DD strings.
 * Controlled with `value`/`onChange`, or uncontrolled with `defaultValue` +
 * `name` in a form.
 */
export function DatePicker({
  id,
  name,
  value,
  defaultValue,
  onChange,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = value ?? inner;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(current);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full justify-start px-3 font-normal",
            !valid && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="text-muted-foreground" />
          {valid ? formatDate(current) : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <BsCalendar
          value={valid ? current : undefined}
          onSelect={(next) => {
            setInner(next);
            onChange?.(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
      {name && <input type="hidden" name={name} value={current} />}
    </Popover>
  );
}
