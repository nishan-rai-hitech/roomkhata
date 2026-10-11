"use client";

import { verifyEmailAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { CircleCheck, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function VerifyEmailForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, startVerify] = useTransition();

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-positive-soft text-positive">
          <CircleCheck size={28} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Email verified</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You can now accept room invitations sent to this address.
        </p>
        <Link
          href="/rooms"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Go to your rooms →
        </Link>
      </div>
    );
  }

  // Verifying on a button press (not on page load) keeps mail scanners that
  // pre-open links from using up the token.
  function verify() {
    setError(null);
    startVerify(async () => {
      const result = await verifyEmailAction({ token });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <MailCheck size={28} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Confirm your email</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        One tap to confirm this email address belongs to you.
      </p>
      <div className="mt-6 space-y-4 text-left">
        <FormError
          message={!token ? "This link is missing its token. Log in and request a new one." : null}
        />
        <FormError message={error} />
        <Button size="lg" className="w-full" loading={loading} disabled={!token} onClick={verify}>
          {loading ? "Verifying…" : "Verify my email"}
        </Button>
      </div>
    </div>
  );
}
