"use client";

import Link from "next/link";
import { useMsg } from "@/i18n/client";
import { legalMessages } from "@/i18n/legal";

// Две обязательные галочки: согласие на обработку данных и подтверждение возраста с условиями.
export function ConsentChecks() {
  const { consent } = useMsg(legalMessages);
  const items = [
    { name: "consent", text: consent.personalData, href: "/privacy" },
    { name: "adult", text: consent.adult, href: "/terms" },
  ];
  return (
    <div className="space-y-3">
      {items.map(({ name, text: [before, link, after], href }) => (
        <label key={name} className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            name={name}
            required
            className="mt-[3px] h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-ink"
          />
          <span>
            {before}
            <Link href={href} target="_blank" className="text-sky-deep underline underline-offset-2 hover:text-ink">
              {link}
            </Link>
            {after}
          </span>
        </label>
      ))}
    </div>
  );
}
