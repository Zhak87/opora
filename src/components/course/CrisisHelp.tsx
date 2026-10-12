"use client";

import { useMsg } from "@/i18n/client";
import { chatMessages } from "@/i18n/chat";

// Те же контакты живой помощи, что и в разговоре.
export function CrisisHelp({ lead, onClose }: { lead?: string; onClose?: () => void }) {
  const t = useMsg(chatMessages);
  return (
    <aside role="alert" className="animate-rise rounded-[24px] border border-lilac/50 bg-lilac-soft/70 p-5 text-[14.5px] leading-relaxed text-ink">
      <p className="font-medium">{t.crisisTitle}</p>
      {lead && <p className="mt-1 text-ink-soft">{lead}</p>}
      <p className="mt-1 text-ink-soft">{t.crisisText}</p>
      <ul className="mt-3 space-y-1">
        <li><a href="tel:112" className="underline-offset-4 hover:underline">112</a> — {t.crisisEmergency}</li>
        <li><a href="tel:88002000122" className="underline-offset-4 hover:underline">8-800-2000-122</a> — {t.crisisRu}</li>
        <li><a href="tel:150" className="underline-offset-4 hover:underline">150</a> — {t.crisisKz}</li>
      </ul>
      {onClose && (
        <button type="button" onClick={onClose} className="mt-3 text-xs text-ink-faint hover:text-ink">
          {t.hide}
        </button>
      )}
    </aside>
  );
}
