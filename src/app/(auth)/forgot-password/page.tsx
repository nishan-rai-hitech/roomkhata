"use client";

import { requestPasswordResetAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { useState, useTransition } from "react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, startRequest] = useTransition();

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-positive-soft text-positive text-xl">
          ✓
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Check your inbox</h2>
        <p className="mt-2 text-sm text-muted">
          If an account exists, we&apos;ve sent a reset link. The link expires in 30 minutes.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Reset your password</h2>
      <p className="mt-1.5 text-sm text-muted">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const email = String(new FormData(e.currentTarget).get("email") || "");
          setError(null);
          startRequest(async () => {
            const result = await requestPasswordResetAction({ email });
            if (result.ok) setSent(true);
            else setError(result.error);
          });
        }}
        className="mt-8 space-y-4"
        noValidate
      >
        {error && (
          <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary hover:underline">
          ← Back to log in
        </Link>
      </p>
    </div>
  );
}
