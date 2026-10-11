"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BS_MONTHS,
  BS_WEEKDAYS,
  adToBs,
  bsToAd,
  daysInBsMonth,
  nepaliDigits,
  type BsDate,
} from "@/lib/bs";
import { cn, formatDate } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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

/** AD date parts of a YYYY-MM-DD string, in English. */
function adLabel(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" });
}

/** The AD months a BS month spans: "Sep/Oct 2026", or "Dec 2026/Jan 2027". */
function adSpan(first: string, last: string): string {
  const [m1, y1] = [adLabel(first, { month: "short" }), first.slice(0, 4)];
  const [m2, y2] = [adLabel(last, { month: "short" }), last.slice(0, 4)];
  if (y1 !== y2) return `${m1} ${y1}/${m2} ${y2}`;
  return m1 === m2 ? `${m1} ${y1}` : `${m1}/${m2} ${y1}`;
}

/** One Bikram Sambat month laid out like a Nepali patro; days are reported as AD YYYY-MM-DD. */
function BsCalendar({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (iso: string) => void;
}) {
  const today = localToday();
  const todayBs = adToBs(today);
  const [view, setView] = useState<Pick<BsDate, "year" | "month">>(() => {
    const start = (value && adToBs(value)) || todayBs;
    return start ? { year: start.year, month: start.month } : { year: BS_MIN_YEAR, month: 1 };
  });

  const days = daysInBsMonth(view.year, view.month);
  const first = bsToAd({ ...view, day: 1 });
  const lead = first ? new Date(`${first}T00:00:00Z`).getUTCDay() : 0;
  // Whole weeks, padded with the neighbouring months' days.
  const cells = first
    ? Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => {
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
    <div className="w-[19rem] max-w-[calc(100vw-2rem)] p-3">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="अघिल्लो महिना"
          disabled={atStart}
          onClick={() => step(-1)}
        >
          <ChevronLeft />
        </Button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
          <Select
            value={String(view.month)}
            onValueChange={(month) => setView({ ...view, month: Number(month) })}
          >
            <SelectTrigger size="sm" className="gap-1 px-2.5 font-semibold" aria-label="महिना">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-64">
              {BS_MONTHS.map((label, i) => (
                <SelectItem key={label} value={String(i + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(view.year)}
            onValueChange={(year) => setView({ ...view, year: Number(year) })}
          >
            <SelectTrigger size="sm" className="gap-1 px-2.5 font-semibold" aria-label="वर्ष">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-64">
              {YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {nepaliDigits(year)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="अर्को महिना"
          disabled={atEnd}
          onClick={() => step(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="mt-1.5 mb-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
        <span>{first ? adSpan(first, addDays(first, days - 1)) : ""}</span>
        {todayBs && (
          <button
            type="button"
            className="rounded-md px-2 py-0.5 font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-[3px] focus-visible:ring-ring/50"
            onClick={() => {
              setView({ year: todayBs.year, month: todayBs.month });
              onSelect(today);
            }}
          >
            आज
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {BS_WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={cn(
              "pb-1 text-xs font-medium text-muted-foreground select-none",
              i === 6 && "text-negative",
            )}
          >
            {day}
          </div>
        ))}
        {cells.map(({ iso, bs }, i) => {
          if (!bs) return <span key={iso} />;
          const outside = bs.month !== view.month;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              aria-label={`${formatDate(iso)} (${adLabel(iso, { day: "numeric", month: "short", year: "numeric" })})`}
              aria-pressed={selected}
              onClick={() => onSelect(iso)}
              className={cn(
                "relative flex aspect-square w-full items-center justify-center rounded-lg text-[15px] font-medium outline-none select-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50",
                // Saturday is the weekly holiday.
                i % 7 === 6 && "text-negative",
                outside && "opacity-40",
                iso === today && !selected && "bg-primary-soft text-primary ring-1 ring-primary/40",
                selected && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {nepaliDigits(bs.day)}
              {/* The AD day, as on a printed patro. */}
              <span
                className={cn(
                  "absolute right-1 bottom-0.5 text-[9px] leading-none font-normal",
                  selected ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {Number(iso.slice(8))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Bikram Sambat (Nepali patro) date picker. Values stay plain AD YYYY-MM-DD
 * strings. Controlled with `value`/`onChange`, or uncontrolled with
 * `defaultValue` + `name` in a form.
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
          {valid ? formatDate(current) : "मिति छान्नुहोस्"}
          {valid && (
            <span className="ml-auto text-xs text-muted-foreground">
              {adLabel(current, { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
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
