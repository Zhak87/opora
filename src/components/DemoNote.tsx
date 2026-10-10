"use client";

import { useEffect, useState } from "react";
import { readDemo } from "@/lib/demo";
import { useMsg } from "@/i18n/client";
import { demoMessages } from "@/i18n/demo";

// Напоминает на входе и регистрации, что пробный разговор не потеряется.
export function DemoNote({ after = false }: { after?: boolean }) {
  const [show, setShow] = useState(false);
  const t = useMsg(demoMessages);
  useEffect(() => setShow(readDemo().some((m) => m.role === "user")), []);
  if (!show) return null;
  return (
    <p className={`rounded-2xl bg-mist/70 px-4 py-3 text-sm leading-relaxed text-ink-soft ${after ? "mt-5" : "mb-6"}`}>
      {after ? t.noteAfter : t.noteBefore}
    </p>
  );
}
