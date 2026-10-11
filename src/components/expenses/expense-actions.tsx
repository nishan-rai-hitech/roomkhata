"use client";

import { deleteExpenseAction } from "@/app/actions/expenses";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
      router.push("/expenses");
    });
  }

  return (
    <>
      <Link href={`/expenses/${id}/edit`}>
        <Button variant="outline">
          <Pencil size={15} /> Edit
        </Button>
      </Link>
      <Button variant="outline" className="text-negative" onClick={() => setOpen(true)}>
        <Trash2 size={15} /> Delete
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this expense?"
        description="Deleting reverses its effect on everyone's balances."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleting || !reason.trim()}
            >
              {deleting ? "Deleting…" : "Delete expense"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-muted">
          For auditability, the original record, who deleted it, and the reason are kept in the
          activity log rather than erased silently.
        </p>
        {error && (
          <div className="mb-3 rounded-lg bg-negative-soft px-3 py-2 text-sm text-negative">
            {error}
          </div>
        )}
        <div>
          <Label htmlFor="reason">Reason (required)</Label>
          <Input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. duplicate entry"
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
