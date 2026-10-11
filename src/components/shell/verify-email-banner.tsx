"use client";

import { resendVerificationAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { MailWarning } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

/** Shown until the signed-in user confirms their email address. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [sending, startSend] = useTransition();

  function resend() {
    startSend(async () => {
      const result = await resendVerificationAction();
      if (result.ok) toast.success(`Verification email sent to ${result.data.email}`);
      else toast.error(result.error);
    });
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-warning/30 bg-warning-soft px-4 py-2.5 text-sm sm:px-6">
      <MailWarning size={16} className="shrink-0 text-warning" />
      <p className="min-w-0 flex-1">
        Confirm <span className="font-medium break-all">{email}</span> to accept room
        invitations. Check your inbox for the link.
      </p>
      <Button variant="outline" size="sm" loading={sending} onClick={resend}>
        Resend email
      </Button>
    </div>
  );
}
