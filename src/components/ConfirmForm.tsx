"use client";

import type { ReactNode } from "react";

// Форма с вопросом «вы уверены?» перед отправкой: для необратимых действий.
export function ConfirmForm({
  action,
  question,
  hidden,
  className = "",
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  question: string;
  hidden: Record<string, string>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={(e) => {
        if (!confirm(question)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
    </form>
  );
}
