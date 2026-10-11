import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  // The form reads the token from the URL, so it renders behind a boundary.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
