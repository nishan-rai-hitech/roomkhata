"use client";

import { Avatar } from "@/components/ui/avatar";
import { formatNpr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Check, ShoppingBasket } from "lucide-react";
import { useEffect, useState } from "react";

const TOTAL = 4000_00; // paisa

const PEOPLE = [
  { name: "Nishan Rai", color: "#059669" },
  { name: "Lalit Rai", color: "#db2777" },
  { name: "Nisha Rai", color: "#2563eb" },
  { name: "Sumit Rai", color: "#d97706" },
];

/** The same Rs 4,000 bill under each of the app's four split methods. */
const MODES = [
  { label: "Equal", hint: "Everyone pays the same", shares: [1000_00, 1000_00, 1000_00, 1000_00] },
  { label: "Shares", hint: "Weighted 2 : 1 : 1 : 1", shares: [1600_00, 800_00, 800_00, 800_00] },
  { label: "Exact", hint: "Type each amount", shares: [1500_00, 1000_00, 1000_00, 500_00] },
  { label: "Percent", hint: "40% · 30% · 20% · 10%", shares: [1600_00, 1200_00, 800_00, 400_00] },
];

/** Hero demo: one bill re-splitting itself as the method changes. */
export function SplitShowcase() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  // Cycle through the methods until the visitor picks one themselves.
  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % MODES.length), 2600);
    return () => clearInterval(timer);
  }, [auto]);

  const mode = MODES[active];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="rk-float rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sidebar-primary/15 text-sidebar-primary">
            <ShoppingBasket size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">Groceries – Bhatbhateni</p>
            <p className="text-xs text-sidebar-muted">Nishan paid · २५ असोज २०८३</p>
          </div>
          <p className="shrink-0 text-lg font-bold text-white tabular">{formatNpr(TOTAL)}</p>
        </div>

        <div
          role="tablist"
          aria-label="Split method"
          className="mt-5 grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1"
        >
          {MODES.map((m, i) => (
            <button
              key={m.label}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => {
                setAuto(false);
                setActive(i);
              }}
              className={cn(
                "rounded-lg px-1 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary",
                i === active
                  ? "bg-sidebar-primary text-sidebar shadow"
                  : "text-sidebar-muted hover:text-white",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-sidebar-muted">{mode.hint}</p>

        <ul className="mt-4 space-y-3.5">
          {PEOPLE.map((person, i) => (
            <li key={person.name} className="flex items-center gap-3">
              <Avatar name={person.name} color={person.color} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-sidebar-foreground">
                    {i === 0 ? "You" : person.name.split(" ")[0]}
                  </span>
                  <span className="shrink-0 font-semibold text-white tabular">
                    {formatNpr(mode.shares[i])}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${(mode.shares[i] / TOTAL) * 100 * 2}%`,
                      backgroundColor: person.color,
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-5 flex items-center justify-center gap-1.5 border-t border-white/10 pt-4 text-xs text-sidebar-muted">
          <Check size={14} className="text-sidebar-primary" />
          Adds up to exactly {formatNpr(TOTAL)} — every time
        </p>
      </div>

      {/* Floating result chips */}
      <div
        className="rk-pop absolute -top-4 -right-2 rounded-2xl border border-white/10 bg-sidebar-accent px-3.5 py-2 text-xs shadow-xl sm:-right-6"
        style={{ animationDelay: "0.9s" }}
      >
        <p className="text-sidebar-muted">You get back</p>
        <p className="text-sm font-bold text-sidebar-primary tabular">
          {formatNpr(TOTAL - mode.shares[0])}
        </p>
      </div>
      <div
        className="rk-pop absolute -bottom-4 -left-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-sidebar-accent px-3.5 py-2 text-xs text-sidebar-foreground shadow-xl sm:-left-6"
        style={{ animationDelay: "1.3s" }}
      >
        <Avatar name="Sumit Rai" color="#d97706" size="sm" className="size-6 text-[10px]" />
        <span>
          <span className="font-semibold text-white">Sumit</span> pays you{" "}
          <span className="font-semibold text-sidebar-primary tabular">
            {formatNpr(mode.shares[3])}
          </span>
        </span>
      </div>
    </div>
  );
}
