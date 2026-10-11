import { Logo } from "@/components/brand";
import { Year } from "@/components/year";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary p-12 text-primary-fg">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.35) 0, transparent 45%)",
          }}
        />
        <Logo className="relative text-primary-fg" />
        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight">
            Shared living, settled simply.
          </h1>
          <p className="mt-4 text-primary-fg/80 leading-relaxed">
            Track every rent, grocery run and utility bill. RoomKhata splits them
            fairly to the paisa and tells everyone exactly who owes whom.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-6 text-sm">
            <div>
              <dt className="text-2xl font-bold">0.00</dt>
              <dd className="text-primary-fg/70">paisa lost to rounding</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold">4</dt>
              <dd className="text-primary-fg/70">split methods</dd>
            </div>
            <div>
              <dt className="text-2xl font-bold">∑=0</dt>
              <dd className="text-primary-fg/70">balances always net to zero</dd>
            </div>
          </dl>
        </div>
        <p className="relative text-xs text-primary-fg/60">
          © <Year /> HiTech Solutions and Services Pvt. Ltd.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
