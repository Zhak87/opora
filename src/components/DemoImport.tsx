"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { importDemo } from "@/lib/actions";
import { clearDemo, readDemo } from "@/lib/demo";

// После входа переносит пробный разговор в аккаунт и открывает его.
export function DemoImport() {
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const messages = readDemo();
    if (!messages.some((m) => m.role === "user")) {
      clearDemo();
      return;
    }
    importDemo(messages)
      .then((id) => {
        clearDemo();
        if (id) router.push(`/talk/${id}`);
      })
      .catch(() => {});
  }, [router]);

  return null;
}
