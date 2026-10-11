"use client";

import { logoutAction, resendVerificationAction } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/actions/settings";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input, Label } from "@/components/ui/input";
import { MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * Shown instead of the app until the signed-in user confirms their email.
 * They can resend the link, fix a mistyped address, or log out — nothing else.
 */
export function VerifyEmailGate({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startAction] = useTransition();

  function resend() {
    startAction(async () => {
      const result = await resendVerificationAction();
      if (result.ok) toast.success(`Verification email sent to ${result.data.email}`);
      else toast.error(result.error);
    });
  }

  function changeEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = String(new FormData(e.currentTarget).get("email") || "");
    setError(null);
    startAction(async () => {
      // Saving a new address sends a fresh verification link to it.
      const result = await updateProfileAction({ name, email: next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      toast.success("Email updated. Check the new inbox for the link.");
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-in text-center duration-500 fill-mode-both fade-in slide-in-from-bottom-3">
        <Logo className="mb-8" />
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MailCheck size={28} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Confirm your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a link to <span className="font-medium break-all text-foreground">{email}</span>.
          Open it to start using RoomKhata. Check your spam folder if you can&apos;t see it.
        </p>

        <div className="mt-6 space-y-2.5">
          <Button size="lg" className="w-full" onClick={() => router.refresh()}>
            I&apos;ve confirmed — continue
          </Button>
          <Button size="lg" variant="outline" className="w-full" loading={busy} onClick={resend}>
            Resend email
          </Button>
        </div>

        {editing ? (
          <form onSubmit={changeEmail} className="mt-6 space-y-3 text-left" noValidate>
            <FormError message={error} />
            <div>
              <Label htmlFor="email">Correct email address</Label>
              <Input id="email" name="email" type="email" defaultValue={email} autoFocus />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" loading={busy}>
                Save and send link
              </Button>
            </div>
          </form>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Wrong address?{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => setEditing(true)}
            >
              Change it
            </button>
            {" · "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => startAction(() => logoutAction())}
            >
              Log out
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
