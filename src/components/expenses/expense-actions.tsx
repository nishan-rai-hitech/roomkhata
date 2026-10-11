"use client";

import { deleteExpenseAction } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import { Input, Label } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function ExpenseActions({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function confirmDelete() {
    setError(null);
    startDelete(async () => {
      const result = await deleteExpenseAction(id, reason);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Expense deleted", { description: "Balances have been updated." });
      router.push("/expenses");
    });
  }

  return (
    <>
      <Button asChild variant="outline">
        <Link href={`/expenses/${id}/edit`}>
          <Pencil /> Edit
        </Link>
      </Button>
      <Button
        variant="outline"
        className="text-negative hover:text-negative"
        onClick={() => setOpen(true)}
      >
        <Trash2 /> Delete
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this expense?"
        description="Deleting reverses its effect on everyone's balances. The record, who deleted it and the reason are kept in the activity log."
        confirmLabel="Delete expense"
        loading={deleting}
        confirmDisabled={!reason.trim()}
        onConfirm={confirmDelete}
      >
        <div className="space-y-3">
          <FormError message={error} />
          <div>
            <Label htmlFor="reason">Reason (required)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. duplicate entry"
              maxLength={200}
              autoFocus
            />
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}
