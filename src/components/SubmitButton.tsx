"use client";

import { useFormStatus } from "react-dom";
import { Button, buttonStyles } from "./ui";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";

export function PendingButton({ children, className, pendingText }: {
  children: React.ReactNode;
  className: string;
  pendingText: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? <span role="status">{pendingText}</span> : children}
    </button>
  );
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: keyof typeof buttonStyles;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const m = useMsg(authMessages);
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? pendingText ?? m.pending : children}
    </Button>
  );
}
