import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getMsg } from "@/i18n/server";
import { common } from "@/i18n/common";
import { legalMessages } from "@/i18n/legal";
import { legalContacts } from "@/lib/consent";

// Страница с юридическим текстом: политика конфиденциальности или условия использования.
export async function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const m = await getMsg(legalMessages);
  const c = await getMsg(common);
  const who = legalContacts({ operator: m.defaultOperator, contact: m.defaultContact });
  const title = kind === "privacy" ? m.privacyTitle : m.termsTitle;
  const sections = kind === "privacy" ? m.privacy(who) : m.terms(who);
  const other = kind === "privacy" ? { href: "/terms", label: m.termsTitle } : { href: "/privacy", label: m.privacyTitle };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-6 sm:px-8">
        <Link href="/" className="font-serif text-xl text-ink">{c.brand}</Link>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-8">
        <h1 className="font-serif text-[32px] leading-tight text-ink sm:text-[40px]">{title}</h1>
        <p className="mt-2 text-sm text-ink-faint">{m.updated}</p>
        {m.draftNote && <p className="mt-2 text-sm text-ink-faint">{m.draftNote}</p>}
        <div className="mt-10 space-y-9">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-3 text-[17px] font-medium text-ink">{s.h}</h2>
              <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
                {s.p.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm">
          <Link href={other.href} className="text-sky-deep hover:text-ink">{other.label}</Link>
        </p>
      </main>
    </div>
  );
}
