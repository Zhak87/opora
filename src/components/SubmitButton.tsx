"use client";

import { useFormStatus } from "react-dom";
import { Button, buttonStyles } from "./ui";
import { useMsg } from "@/i18n/client";
import { authMessages } from "@/i18n/auth";

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
