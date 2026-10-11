"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full max-w-md rounded-[var(--radius)] border border-border bg-surface shadow-xl",
          "animate-in fade-in zoom-in-95 duration-150",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
