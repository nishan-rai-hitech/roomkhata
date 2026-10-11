import { Logo } from "@/components/brand";
import { Year } from "@/components/year";
import { HandCoins, PieChart, Scale } from "lucide-react";
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
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(40rem 28rem at 0% 0%, color-mix(in oklab, var(--sidebar-primary) 26%, transparent), transparent 70%), radial-gradient(34rem 26rem at 100% 100%, color-mix(in oklab, var(--sidebar-primary) 16%, transparent), transparent 70%)",
          }}
        />
        <Logo inverted className="relative" />

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white">
            Shared living,
            <br />
            <span className="text-sidebar-primary">settled simply.</span>
          </h1>
          <p className="mt-4 leading-relaxed text-sidebar-muted">
            Track every rent, grocery run and utility bill. RoomKhata splits them fairly and tells
            everyone exactly who owes whom.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent text-sidebar-primary">
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
          © <Year /> HiTech Solutions and Services Pvt. Ltd.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
