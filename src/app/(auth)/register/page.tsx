"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input, Label } from "@/components/ui/input";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { useMemo, useState, useTransition } from "react";

function passwordScore(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] };
}

export default function RegisterPage() {
  const [loading, startRegister] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const strength = useMemo(() => passwordScore(pw), [pw]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    if (!name || !email || !pw) {
      setError("All fields are required.");
      return;
    }
    if (strength.score < 2) {
      setError("Choose a stronger password.");
      return;
    }
    setError(null);
    startRegister(async () => {
      // On success the action redirects to the dashboard and never returns.
      const result = await registerAction({ name, email, password: pw });
      if (result && !result.ok) setError(result.error);
    });
  }

  const barColors = ["bg-border", "bg-negative", "bg-warning", "bg-primary", "bg-positive"];

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Start splitting fairly in minutes.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <FormError message={error} />

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Nishan Shrestha" autoComplete="name" />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {pw && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength.score ? barColors[strength.score] : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">{strength.label}</span>
            </div>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          By continuing you agree to RoomKhata&apos;s Terms and Privacy Policy.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
