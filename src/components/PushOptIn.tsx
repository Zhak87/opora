"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { pushMessages } from "@/i18n/push";

const subscriptionUrl = "/api/push/subscription";
type Status = "loading" | "ready" | "enabled" | "install" | "blocked" | "unsupported" | "failed";

export function PushOptIn({ publicKey, locale, prompt = false }: { publicKey: string; locale: Locale; prompt?: boolean }) {
  const m = pushMessages[locale];
  const [status, setStatus] = useState<Status>("loading");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function prepare() {
      const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (appleMobile && !matchMedia("(display-mode: standalone)").matches &&
          !(navigator as Navigator & { standalone?: boolean }).standalone) {
        return "install";
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
      await navigator.serviceWorker.register("/push-sw.js");
      const worker = await navigator.serviceWorker.ready;
      if (active) setRegistration(worker);
      if (Notification.permission === "denied") return "blocked";
      const subscription = await worker.pushManager.getSubscription();
      if (!subscription) return "ready";
      const response = await fetch(subscriptionUrl, { cache: "no-store" });
      if (!response.ok) return "failed";
      return (await response.json()).enabled ? "enabled" : "ready";
    }
    prepare().then((next) => { if (active) setStatus(next); }, () => { if (active) setStatus("failed"); });
    return () => { active = false; };
  }, []);

  async function toggle() {
    if (!registration || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      if (status === "enabled") {
        const response = await fetch(subscriptionUrl, { method: "DELETE" });
        if (!response.ok) throw new Error();
        setStatus("ready");
        const subscription = await registration.pushManager.getSubscription();
        await subscription?.unsubscribe();
      } else {
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
        const response = await fetch(subscriptionUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(subscription),
        });
        if (!response.ok) throw new Error();
        setStatus("enabled");
      }
    } catch {
      if (Notification.permission === "denied") setStatus("blocked");
      else setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || (prompt && ["enabled", "blocked", "unsupported", "failed"].includes(status))) return null;
  return (
    <section className="mb-4 rounded-2xl border border-line bg-paper p-4 text-sm text-ink-soft" aria-live="polite">
      {status === "install" && prompt ? (
        <details>
          <summary className="cursor-pointer font-medium text-ink">{m.enable}</summary>
          <p className="mt-2">{m.install}</p>
        </details>
      ) : status === "ready" || status === "enabled" ? (
        <>
          {status === "enabled" && <p className="mb-2">{m.enabled}</p>}
          <button type="button" className="font-medium text-ink underline underline-offset-4 disabled:opacity-60" disabled={busy} onClick={toggle}>
            {status === "enabled" ? m.disable : m.enable}
          </button>
        </>
      ) : <p>{m[status]}</p>}
      {failed && <p className="mt-2">{m.failed}</p>}
    </section>
  );
}
