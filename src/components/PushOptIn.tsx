"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";
import { pushMessages } from "@/i18n/push";
import { buttonStyles } from "@/components/ui";
import { setNotificationEmail } from "@/lib/notification-email-actions";

const subscriptionUrl = "/api/push/subscription";
type Status = "loading" | "ready" | "enabled" | "install" | "blocked" | "unsupported" | "failed";

export function PushOptIn({ publicKey, locale, prompt = false, email }: {
  publicKey?: string; locale: Locale; prompt?: boolean; email?: { available: boolean; enabled: boolean };
}) {
  const m = pushMessages[locale];
  const [status, setStatus] = useState<Status>("loading");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(email?.enabled ?? false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function prepare() {
      if (!publicKey) return "unsupported";
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
  }, [publicKey]);

  async function toggle() {
    if (!registration || !publicKey || busy) return;
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

  async function toggleEmail(enabled: boolean) {
    setEmailBusy(true);
    setEmailFailed(false);
    try {
      if (!(await setNotificationEmail(enabled))) throw new Error();
      setEmailEnabled(enabled);
    } catch {
      setEmailFailed(true);
    } finally {
      setEmailBusy(false);
    }
  }

  if (status === "loading" || (prompt && ["enabled", "blocked", "unsupported", "failed"].includes(status))) return null;
  const canEnablePhone = status === "ready" || status === "install";
  const canEnableEmail = email?.available && !emailEnabled;
  const actionLabel = canEnablePhone && canEnableEmail ? m.enableBoth : canEnablePhone ? m.enable : m.enableEmail;

  function enable() {
    if (status === "ready") void toggle();
    if (status === "install") setShowInstall(true);
    if (canEnableEmail) void toggleEmail(true);
  }

  return (
    <section className="mb-4 rounded-2xl border border-line bg-paper p-4 text-sm text-ink-soft" aria-live="polite">
      {(canEnableEmail || (canEnablePhone && (status !== "install" || !showInstall))) && (
        <div>
          <button type="button" className={`${buttonStyles.primary} w-full sm:w-auto`} disabled={busy || emailBusy} onClick={enable}>
            {actionLabel}
          </button>
          {canEnableEmail && canEnablePhone && <p className="mt-2">{m.bothHint}</p>}
        </div>
      )}
      {status === "install" && showInstall && <p className="mt-2">{m.install}</p>}
      {(status === "blocked" || status === "failed" || (status === "unsupported" && publicKey)) && <p className="mt-2">{m[status]}</p>}
      {status === "enabled" && (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <p>{m.enabled}</p>
          <button type="button" className="underline underline-offset-4" disabled={busy} onClick={toggle}>{m.disable}</button>
        </div>
      )}
      {emailEnabled && (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <p>{m.emailEnabled}</p>
          <button type="button" className="underline underline-offset-4" disabled={emailBusy} onClick={() => void toggleEmail(false)}>{m.disableEmail}</button>
        </div>
      )}
      {failed && <p className="mt-2">{m.failed}</p>}
      {emailFailed && !failed && <p className="mt-2">{m.failed}</p>}
    </section>
  );
}
