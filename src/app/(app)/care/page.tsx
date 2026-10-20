import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { SCOPES, auditFor, myCare } from "@/lib/pro";
import { endLink, setConsent } from "@/lib/pro-actions";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { careMessages } from "@/i18n/care";
import { proLabels } from "@/i18n/pro";
import { Card, Notice, PageHeader } from "@/components/ui";
import { Avatar } from "@/components/pro/bits";
import { AuditList } from "@/components/pro/AuditList";
import { ConfirmForm } from "@/components/ConfirmForm";
import { HeartHandIcon, ShieldIcon } from "@/components/icons";

// «Мой психолог»: с кем человек работает и что разрешил видеть. Каждое разрешение выключается одним касанием.
export default async function CarePage({ searchParams }: { searchParams: Promise<{ joined?: string; ended?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = careMessages[locale];
  const labels = proLabels[locale];
  const [care, log] = await Promise.all([myCare(supabase, user!.id), auditFor(supabase, { client: user!.id }, 30)]);

  return (
    <>
      <PageHeader title={m.care.title}>{care.length ? m.care.intro : null}</PageHeader>
      <div className="stagger space-y-5">
        {sp.ended && <Notice>{m.care.ended}</Notice>}
        {sp.joined && <Notice>{m.care.joined}</Notice>}

        {care.length === 0 && (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-mist/70 via-paper to-sage-soft/60 p-7 sm:p-9">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-paper/80 text-sage-deep shadow-soft">
                <HeartHandIcon className="h-6 w-6" />
              </span>
              <h2 className="mt-5 font-serif text-[26px] leading-snug text-ink">{m.care.emptyTitle}</h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{m.care.emptyText}</p>
              <p className="mt-3 text-sm text-ink-faint">{m.care.emptyHint}</p>
            </div>
          </Card>
        )}

        {care.map(({ link, psychologist: p, scopes }) => (
          <Card key={link.id} className="overflow-hidden">
            <div className="flex items-center gap-4 border-b border-line/60 bg-gradient-to-r from-paper to-lilac-soft/50 p-6 sm:p-7">
              <Avatar name={p?.full_name ?? "?"} src={p?.photo_url} size={64} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-[22px] text-ink">{p?.full_name}</p>
                {p?.specializations.length ? (
                  <p className="truncate text-sm text-ink-soft">
                    {p.specializations.slice(0, 3).map((s) => labels.specializations[s as keyof typeof labels.specializations] ?? s).join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-ink-faint">
                  {link.status === "pending"
                    ? m.care.pending
                    : m.care.since(new Date(link.activated_at ?? link.created_at).toLocaleDateString(INTL[locale], { day: "numeric", month: "long", year: "numeric" }))}
                </p>
              </div>
              {p && (
                <Link href={`/p/${p.slug}`} className="hidden shrink-0 text-sm text-sky-deep hover:text-ink sm:block">
                  {m.invite.open}
                </Link>
              )}
            </div>

            <div className="p-6 sm:p-7">
              <h3 className="text-[15px] font-medium text-ink">{m.care.shareTitle}</h3>
              <p className="mt-1 text-sm text-ink-soft">{m.care.shareIntro}</p>
              <ul className="mt-4 divide-y divide-line/60 rounded-2xl border border-line/70">
                {SCOPES.map((s) => {
                  const on = scopes.includes(s);
                  return (
                    <li key={s}>
                      <form action={setConsent} className="flex items-center gap-4 px-4 py-3.5">
                        <input type="hidden" name="link" value={link.id} />
                        <input type="hidden" name="scope" value={s} />
                        <input type="hidden" name="granted" value={on ? "0" : "1"} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] text-ink">{m.scopes[s].title}</span>
                          <span className="block text-[13px] leading-relaxed text-ink-faint">{m.scopes[s].text}</span>
                        </span>
                        <button
                          role="switch"
                          aria-checked={on}
                          aria-label={m.scopes[s].title}
                          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-sage" : "bg-sand-deep"}`}
                        >
                          <span className={`absolute top-1 h-5 w-5 rounded-full bg-paper shadow-soft transition-all duration-300 ${on ? "left-6" : "left-1"}`} />
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">{m.invite.always}</p>

              <div className="mt-5 flex items-start gap-3 rounded-2xl bg-mist/50 px-4 py-3 text-[13px] leading-relaxed text-sky-deep">
                <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {m.care.privateText} {m.care.aiNote}
                </span>
              </div>

              <ConfirmForm action={endLink} question={m.care.endConfirm} hidden={{ link: link.id }} className="mt-5">
                <button className="h-11 rounded-full px-4 text-sm text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">{m.care.end}</button>
              </ConfirmForm>
            </div>
          </Card>
        ))}

        {log.length > 0 && (
          <Card className="p-6 sm:p-7">
            <h2 className="mb-4 text-[15px] font-medium text-ink">{m.care.logTitle}</h2>
            <AuditList rows={log} locale={locale} me={user!.id} empty={m.care.logEmpty} />
          </Card>
        )}
      </div>
    </>
  );
}
