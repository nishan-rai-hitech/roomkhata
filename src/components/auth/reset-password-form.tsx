"use client";

import { resetPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, startReset] = useTransition();

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-positive-soft text-positive text-xl">
          ✓
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Password updated</h2>
        <p className="mt-2 text-sm text-muted">
          You&apos;ve been signed out everywhere. Log in with your new password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Go to log in →
        </Link>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    if (password !== String(form.get("confirm") || "")) {
      setError("The two passwords don't match.");
      return;
    }
    setError(null);
    startReset(async () => {
      const result = await resetPasswordAction({ token, password });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Choose a new password</h2>
      <p className="mt-1.5 text-sm text-muted">Use at least 8 characters.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {!token && (
          <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
            This reset link is missing its token. Request a new one.
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading || !token}>
          {loading ? "Saving…" : "Set new password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Request a new link
        </Link>
      </p>
    </div>
  );
}
