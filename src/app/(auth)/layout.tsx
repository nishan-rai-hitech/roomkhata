import { Logo } from "@/components/brand";
import { Year } from "@/components/year";
import { ArrowLeft, HandCoins, PieChart, Scale } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const highlights = [
  {
    icon: PieChart,
    title: "Four ways to split",
    text: "Equally, by shares, by percent or exact amounts.",
  },
  {
    icon: Scale,
    title: "Exact to the paisa",
    text: "No rounding drift — balances always net to zero.",
  },
  {
    icon: HandCoins,
    title: "Settle with fewer payments",
    text: "See the simplest way for everyone to square up.",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="rk-drift absolute -top-40 -left-32 size-[34rem] rounded-full bg-sidebar-primary/25 blur-3xl" />
          <div
            className="rk-drift absolute -right-40 -bottom-48 size-[30rem] rounded-full bg-sidebar-primary/15 blur-3xl"
            style={{ animationDelay: "-7s" }}
          />
          <div className="rk-grid absolute inset-0" />
        </div>
        <Link href="/" aria-label="RoomKhata home" className="relative w-fit">
          <Logo inverted />
        </Link>

        <div className="relative max-w-md">
          <h1 className="animate-in text-4xl leading-[1.1] font-bold tracking-tight text-white duration-700 fill-mode-both fade-in slide-in-from-bottom-4">
            Shared living,
            <br />
            <span className="bg-gradient-to-r from-sidebar-primary to-emerald-200 bg-clip-text text-transparent">
              settled simply.
            </span>
          </h1>
          <p className="mt-4 animate-in leading-relaxed text-sidebar-muted delay-150 duration-700 fill-mode-both fade-in slide-in-from-bottom-4">
            Track every rent, grocery run and utility bill. RoomKhata splits them fairly and tells
            everyone exactly who owes whom.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className="group flex animate-in items-start gap-4 duration-700 fill-mode-both fade-in slide-in-from-left-6"
                style={{ animationDelay: `${300 + i * 140}ms` }}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-sidebar-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-muted">
          © <Year /> Developed by Nishan Kumar Rai
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-in duration-500 fill-mode-both fade-in slide-in-from-bottom-3">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={15} /> Home
          </Link>
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
