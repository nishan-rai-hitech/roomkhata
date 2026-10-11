import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { Suspense } from "react";

export default function VerifyEmailPage() {
  // The form reads the token from the URL, so it renders behind a boundary.
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
