"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, isValid, parse } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

const ISO = "yyyy-MM-dd";

/**
 * Calendar date picker working in plain YYYY-MM-DD strings. Controlled with
 * `value`/`onChange`, or uncontrolled with `defaultValue` + `name` in a form.
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
  const parsed = current ? parse(current, ISO, new Date()) : undefined;
  const date = parsed && isValid(parsed) ? parsed : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full justify-start px-3 font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="text-muted-foreground" />
          {date ? format(date, "d MMM yyyy") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          onSelect={(day) => {
            if (!day) return;
            const next = format(day, ISO);
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
