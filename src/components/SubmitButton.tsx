"use client";

import { useFormStatus } from "react-dom";
import { Button, buttonStyles } from "./ui";

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
  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? pendingText ?? "Секунду…" : children}
    </Button>
  );
}
