import { Logo } from "@/components/brand";
import { Reveal } from "@/components/landing/reveal";
import { SplitShowcase } from "@/components/landing/split-showcase";
import { Button } from "@/components/ui/button";
import { Year } from "@/components/year";
import { formatNpr } from "@/lib/money";
import {
  ArrowRight,
  CalendarDays,
  DoorOpen,
  FileText,
  HandCoins,
  PieChart,
  Receipt,
  Scale,
  Smartphone,
  Users,
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: PieChart,
    title: "Four ways to split",
    text: "Equally, by shares, by exact amounts or by percent — pick what's fair for each bill.",
  },
  {
    icon: Scale,
    title: "Exact to the paisa",
    text: "Money is stored in paisa, so shares always add up to the bill. No rounding drift.",
  },
  {
    icon: HandCoins,
    title: "Settle with fewer payments",
    text: "RoomKhata works out the shortest list of payments that clears everyone's balance.",
  },
  {
    icon: CalendarDays,
    title: "नेपाली पात्रो built in",
    text: "Pick dates in Bikram Sambat and read monthly totals by Nepali month.",
  },
  {
    icon: Users,
    title: "Rooms and roles",
    text: "Invite flatmates by email or a share code. Owners and admins keep things tidy.",
  },
  {
    icon: FileText,
    title: "Monthly reports",
    text: "See spending by category and by person, then export it as CSV or print it.",
  },
];

const steps = [
  {
    icon: DoorOpen,
    title: "Create a room",
    text: "Name your flat and share the invite code with everyone who lives there.",
  },
  {
    icon: Receipt,
    title: "Add what you spend",
    text: "Rent, groceries, the electricity bill — add it once and choose how to split it.",
  },
  {
    icon: HandCoins,
    title: "Settle up",
    text: "See exactly who pays whom, pay however you like, and record it in a tap.",
  },
];

const ticker = [
  "Rent",
  "Groceries",
  "Electricity",
  "Internet",
  "Momo night",
  "Gas cylinder",
  "Water jar",
  "Dish Home",
  "Cleaning",
  "Tarkari",
];

// A tangle of IOUs and the same debts after simplification (net: Lalit −700, others +300/+200/+200).
const before = [
  ["Lalit", "You", 800_00],
  ["You", "Nisha", 500_00],
  ["Nisha", "Sumit", 500_00],
  ["Sumit", "Lalit", 300_00],
  ["Lalit", "Nisha", 200_00],
] as const;
const after = [
  ["Lalit", "You", 300_00],
  ["Lalit", "Nisha", 200_00],
  ["Lalit", "Sumit", 200_00],
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
        <div className="pointer-events-none absolute inset-0">
          <div className="rk-drift absolute -top-40 -right-32 size-[34rem] rounded-full bg-sidebar-primary/25 blur-3xl" />
          <div
            className="rk-drift absolute -bottom-48 -left-40 size-[30rem] rounded-full bg-sidebar-primary/15 blur-3xl"
            style={{ animationDelay: "-7s" }}
          />
          <div className="rk-grid absolute inset-0" />
        </div>

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="RoomKhata home">
            <Logo inverted />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              className="text-sidebar-foreground hover:bg-white/10 hover:text-white dark:hover:bg-white/10"
            >
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild className="bg-sidebar-primary text-sidebar hover:bg-sidebar-primary/90">
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </header>

        <section className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-14 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-28">
          <div>
            <p className="inline-flex animate-in items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sidebar-foreground duration-700 fill-mode-both fade-in slide-in-from-bottom-3">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sidebar-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-sidebar-primary" />
              </span>
              कोठाको हिसाब, सजिलो
            </p>
            <h1 className="mt-5 animate-in text-4xl leading-[1.05] font-bold tracking-tight text-white delay-100 duration-700 fill-mode-both fade-in slide-in-from-bottom-4 sm:text-6xl">
              Shared living,
              <br />
              <span className="bg-gradient-to-r from-sidebar-primary to-emerald-200 bg-clip-text text-transparent">
                settled simply.
              </span>
            </h1>
            <p className="mt-5 max-w-lg animate-in text-base leading-relaxed text-sidebar-muted delay-200 duration-700 fill-mode-both fade-in slide-in-from-bottom-4 sm:text-lg">
              RoomKhata is the shared khata for your flat. Add the rent, the groceries and the
              electricity bill — it splits them fairly and tells everyone exactly who owes whom.
            </p>
            <div className="mt-8 flex animate-in flex-wrap gap-3 delay-300 duration-700 fill-mode-both fade-in slide-in-from-bottom-4">
              <Button
                asChild
                size="lg"
                className="group h-12 bg-sidebar-primary px-6 text-base text-sidebar hover:bg-sidebar-primary/90"
              >
                <Link href="/register">
                  Create your room
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/20 bg-white/5 px-6 text-base text-white hover:bg-white/15 hover:text-white dark:border-white/20 dark:bg-white/5 dark:hover:bg-white/15"
              >
                <Link href="/login">I have an account</Link>
              </Button>
            </div>
            <p className="mt-6 flex animate-in items-center gap-2 text-sm text-sidebar-muted delay-500 duration-700 fill-mode-both fade-in">
              <Smartphone size={16} /> Works in any browser, on your phone or laptop.
            </p>
          </div>

          <div className="min-w-0 animate-in px-2 delay-300 duration-1000 fill-mode-both fade-in zoom-in-95 sm:px-6">
            <SplitShowcase />
          </div>
        </section>

        {/* Ticker of everyday flat expenses */}
        <div className="relative overflow-hidden border-t border-white/10 py-4" aria-hidden>
          <div className="rk-marquee flex w-max gap-3 pr-3">
            {[...ticker, ...ticker].map((item, i) => (
              <span
                key={i}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm whitespace-nowrap text-sidebar-muted"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* Features */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              Why RoomKhata
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything a shared flat needs, nothing it doesn&apos;t
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={(i % 3) * 90}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Fewer payments */}
        <section className="border-y border-border bg-muted/50">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2">
            <Reveal>
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">
                Settle up
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Five IOUs become three payments
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                Who paid for what gets tangled fast. RoomKhata adds it all up and shows the
                shortest way for everyone to end at zero — so nobody passes the same money around
                in a circle.
              </p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              <Reveal delay={100}>
                <div className="h-full rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Before · 5 payments
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {before.map(([from, to, amount]) => (
                      <li key={from + to} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">
                          {from} <ArrowRight size={12} className="inline" /> {to}
                        </span>
                        <span className="tabular">{formatNpr(amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={250}>
                <div className="h-full rounded-2xl border border-primary/40 bg-primary-soft p-5 shadow-xs">
                  <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                    With RoomKhata · 3 payments
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm">
                    {after.map(([from, to, amount]) => (
                      <li key={from + to} className="flex items-center justify-between gap-2">
                        <span>
                          {from} <ArrowRight size={12} className="inline text-primary" /> {to}
                        </span>
                        <span className="font-semibold text-primary tabular">
                          {formatNpr(amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in three steps
            </h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-8 md:grid-cols-3">
            {/* Line joining the steps */}
            <div className="absolute top-7 right-[16.6%] left-[16.6%] hidden border-t-2 border-dashed border-border md:block" />
            {steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title}>
                <Reveal delay={i * 150} className="relative text-center">
                  <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-8 ring-background">
                    <Icon size={22} />
                    <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* Call to action */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-sidebar px-6 py-14 text-center text-white shadow-xl sm:px-12">
              <div className="pointer-events-none absolute inset-0">
                <div className="rk-drift absolute -top-32 left-1/2 size-[26rem] -translate-x-1/2 rounded-full bg-sidebar-primary/25 blur-3xl" />
              </div>
              <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
                Stop arguing about who owes what.
              </h2>
              <p className="relative mx-auto mt-3 max-w-md text-sidebar-muted">
                Set up your room now and add your first expense in under a minute.
              </p>
              <Button
                asChild
                size="lg"
                className="group relative mt-7 h-12 bg-sidebar-primary px-7 text-base text-sidebar hover:bg-sidebar-primary/90"
              >
                <Link href="/register">
                  Create your room
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <Logo size={26} />
          <p>
            © <Year /> Developed by Nishan Kumar Rai
          </p>
        </div>
      </footer>
    </div>
  );
}
