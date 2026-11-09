"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendInviteEmail } from "@/lib/share-actions";
import { SubmitButton } from "../SubmitButton";
import { Notice } from "../ui";
import { CheckIcon, CopyIcon, MailIcon, TelegramIcon, WhatsAppIcon } from "../icons";
import { useMsg } from "@/i18n/client";
import { shareMessages } from "@/i18n/share";

const pill =
  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mist";

// Поделиться ссылкой одной кнопкой: WhatsApp и Telegram открываются с готовым текстом,
// письмо уходит из Опоры (если почта настроена) или открывается в почтовом приложении.
export function ShareLink({
  url,
  text,
  kind,
  invite,
  emailEnabled,
  mailSubject,
}: {
  url: string;
  text: string;
  kind: "client" | "colleague";
  invite?: string;
  emailEnabled: boolean;
  mailSubject: string;
}) {
  const m = useMsg(shareMessages);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const message = `${text}\n${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const mailto = `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={wa} target="_blank" rel="noopener noreferrer" className={`${pill} bg-[#e3efe2] text-[#3f6b47] hover:bg-[#d6e8d4]`}>
          <WhatsAppIcon className="h-4 w-4" />
          {m.whatsapp}
        </a>
        <a href={tg} target="_blank" rel="noopener noreferrer" className={`${pill} bg-mist/70 text-sky-deep hover:bg-mist`}>
          <TelegramIcon className="h-4 w-4" />
          {m.telegram}
        </a>
        {emailEnabled ? (
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`${pill} bg-lilac-soft/70 text-lilac-deep hover:bg-lilac-soft`}>
            <MailIcon className="h-4 w-4" />
            {m.email}
          </button>
        ) : (
          <a href={mailto} className={`${pill} bg-lilac-soft/70 text-lilac-deep hover:bg-lilac-soft`}>
            <MailIcon className="h-4 w-4" />
            {m.email}
          </a>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {}
          }}
          className={`${pill} bg-ink text-paper hover:bg-ink/90`}
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? m.copied : m.copy}
        </button>
      </div>
      {emailEnabled && open && <EmailForm kind={kind} invite={invite} />}
    </div>
  );
}

function EmailForm({ kind, invite }: { kind: "client" | "colleague"; invite?: string }) {
  const m = useMsg(shareMessages);
  const [state, action] = useActionState(sendInviteEmail, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  const input =
    "w-full rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-faint outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft";
  return (
    <form ref={form} action={action} className="animate-rise space-y-3 rounded-[22px] bg-sand/50 p-4">
      <input type="hidden" name="kind" value={kind} />
      {invite && <input type="hidden" name="invite" value={invite} />}
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{m.emailLabel}</span>
        <input name="email" type="email" required autoComplete="off" placeholder={m.emailPlaceholder} className={`${input} h-12`} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-soft">{m.noteLabel}</span>
        <textarea name="note" maxLength={300} rows={2} placeholder={m.notePlaceholder} className={`${input} resize-none py-3`} />
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}
      <SubmitButton className="h-11 w-full sm:w-auto" pendingText={m.sending}>
        {m.send}
      </SubmitButton>
    </form>
  );
}
