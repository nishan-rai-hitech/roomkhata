import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { CircleAlert } from "lucide-react";

/** Inline error for forms and dialogs. Renders nothing without a message. */
export function FormError({ message, className }: { message?: string | null; className?: string }) {
  if (!message) return null;
  return (
    <Alert
      variant="destructive"
      className={cn("border-negative/25 bg-negative-soft py-2.5", className)}
    >
      <CircleAlert />
      <AlertDescription className="text-negative">{message}</AlertDescription>
    </Alert>
  );
}
