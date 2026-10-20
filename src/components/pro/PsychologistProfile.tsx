import type { ReactNode } from "react";
import type { Psychologist } from "@/lib/pro";
import { formatPrice } from "@/lib/pro";
import { INTL, type Locale } from "@/i18n/config";
import { careMessages } from "@/i18n/care";
import { proLabels } from "@/i18n/pro";
import { Avatar, Chip } from "./bits";
import { ShieldIcon } from "../icons";

// Профиль психолога для клиента: в каталоге, по ссылке-приглашению и в разделе «Психолог».
export function PsychologistProfile({ p, locale, action }: { p: Psychologist; locale: Locale; action?: ReactNode }) {
  const m = careMessages[locale].profile;
  const labels = proLabels[locale];
  const price = formatPrice(p.price, p.currency, INTL[locale]);
  return (
    <article className="overflow-hidden rounded-[32px] border border-line/70 bg-paper/85 shadow-lift">
      <div className="bg-gradient-to-br from-mist/80 via-paper to-lilac-soft/70 p-6 sm:p-9">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={p.full_name} src={p.photo_url} size={112} />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[38px]">{p.full_name}</h1>
            {p.headline && <p className="mt-2 text-[16px] leading-relaxed text-ink-soft">{p.headline}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {p.status === "approved" && (
                <Chip tone="bg-sage-soft text-sage-deep">
                  <ShieldIcon className="mr-1.5 h-4 w-4" />
                  {m.verified}
                </Chip>
              )}
              {p.experience_years != null && <Chip>{m.years(p.experience_years)}</Chip>}
              {p.formats.map((f) => (
                <Chip key={f}>{labels.formats[f as keyof typeof labels.formats] ?? f}</Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {price ? (
            <p className="text-[15px] text-ink-soft">
              <span className="font-serif text-[26px] text-ink">{price}</span> {m.perSession(p.session_minutes)}
            </p>
          ) : (
            <span />
          )}
          {action}
        </div>
        {!p.accepting_clients && <p className="mt-3 text-sm text-[#a0614f]">{m.notAccepting}</p>}
      </div>

      <div className="grid gap-8 p-6 sm:p-9 md:grid-cols-[1fr_260px]">
        <div className="space-y-7">
          {p.specializations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {p.specializations.map((s) => (
                <Chip key={s} tone="bg-lilac-soft/80 text-lilac-deep">
                  {labels.specializations[s as keyof typeof labels.specializations] ?? s}
                </Chip>
              ))}
            </div>
          )}
          {p.about && <Section title={m.about}>{p.about}</Section>}
          {p.approach && <Section title={m.approach}>{p.approach}</Section>}
        </div>
        <aside className="space-y-6 text-sm">
          {p.education.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs uppercase tracking-[0.14em] text-ink-faint">{m.education}</h2>
              <ul className="space-y-2">
                {p.education.map((e, i) => (
                  <li key={i} className="leading-relaxed text-ink">
                    {e.institution}
                    {(e.degree || e.year) && <span className="block text-ink-soft">{[e.degree, e.year].filter(Boolean).join(", ")}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="mb-2 text-xs uppercase tracking-[0.14em] text-ink-faint">{m.languages}</h2>
            <p className="text-ink">{p.languages.map((l) => labels.languages[l as keyof typeof labels.languages] ?? l).join(", ")}</p>
          </div>
          {p.city && (
            <div>
              <h2 className="mb-2 text-xs uppercase tracking-[0.14em] text-ink-faint">{m.formats}</h2>
              <p className="text-ink">{p.city}</p>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section>
      <h2 className="mb-2 text-xs uppercase tracking-[0.14em] text-ink-faint">{title}</h2>
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{children}</p>
    </section>
  );
}
