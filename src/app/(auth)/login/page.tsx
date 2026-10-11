"use client";

import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { useState, useTransition } from "react";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, startLogin] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError(null);
    startLogin(async () => {
      // On success the action redirects to the dashboard and never returns.
      const result = await loginAction({ email, password });
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
      <p className="mt-1.5 text-sm text-muted">
        Log in to see your room balances.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {error && (
          <div className="rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
            {error}
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline mb-1.5"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-foreground"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to RoomKhata?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
