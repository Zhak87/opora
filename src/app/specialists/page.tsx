import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PUBLIC_COLUMNS, formatPrice, type Psychologist } from "@/lib/pro";
import { freeSlots } from "@/lib/sessions";
import { getTimeZone } from "@/lib/tz";
import { whenLabel } from "@/lib/time";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { scheduleMessages } from "@/i18n/schedule";
import { careMessages } from "@/i18n/care";
import { proLabels, SPECIALIZATIONS, SESSION_LANGUAGES, FORMATS } from "@/i18n/pro";
import { PublicShell } from "@/components/pro/PublicShell";
import { Avatar, Chip } from "@/components/pro/bits";
import { ShieldIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui";

const PRICES = [10000, 15000, 20000, 30000];
const select =
  "h-11 w-full rounded-2xl border border-line bg-paper px-3 text-[14px] text-ink outline-none focus:border-sky focus:ring-4 focus:ring-mist";

type Search = { spec?: string; price?: string; format?: string; lang?: string; when?: string };

// Каталог проверенных психологов. Открыт и без входа: правило базы отдаёт только опубликованные анкеты.
export default async function Specialists({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const tz = await getTimeZone();
  const m = scheduleMessages[locale].catalog;
  const care = careMessages[locale].profile;
  const labels = proLabels[locale];

  let q = supabase.from("psychologists").select(PUBLIC_COLUMNS).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(60);
  if (sp.spec && (SPECIALIZATIONS as readonly string[]).includes(sp.spec)) q = q.contains("specializations", [sp.spec]);
  if (sp.format && (FORMATS as readonly string[]).includes(sp.format)) q = q.contains("formats", [sp.format]);
  if (sp.lang && (SESSION_LANGUAGES as readonly string[]).includes(sp.lang)) q = q.contains("languages", [sp.lang]);
  if (sp.price && Number(sp.price) > 0) q = q.lte("price", Number(sp.price));
  const { data } = await q;
  const list = (data ?? []) as unknown as Psychologist[];

  const withSlots = await Promise.all(
    list.map(async (p) => ({ p, next: p.accepting_clients ? (await freeSlots(supabase, p.user_id, 14))[0] ?? null : null })),
  );
  const days = sp.when === "3" ? 3 : sp.when === "7" ? 7 : 0;
  const shown = days
    ? withSlots.filter((x) => x.next && Date.parse(x.next.starts_at) < Date.now() + days * 86_400_000)
    : withSlots;

  return (
    <PublicShell home={user ? "/" : "/welcome"} wide>
      <header className="mb-8 max-w-2xl animate-rise">
        <h1 className="font-serif text-[34px] leading-tight text-ink sm:text-[44px]">{m.title}</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">{m.intro}</p>
      </header>

      <form className="mb-8 grid grid-cols-2 gap-3 rounded-[28px] border border-line/70 bg-paper/80 p-4 shadow-soft sm:p-5 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
        <label className="col-span-2 lg:col-span-1">
          <span className="mb-1.5 block text-xs text-ink-faint">{m.specialization}</span>
          <select name="spec" defaultValue={sp.spec ?? ""} className={select}>
            <option value="">{m.any}</option>
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>
                {labels.specializations[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs text-ink-faint">{m.maxPrice}</span>
          <select name="price" defaultValue={sp.price ?? ""} className={select}>
            <option value="">{m.anyPrice}</option>
            {PRICES.map((v) => (
              <option key={v} value={v}>
                {formatPrice(v, "KZT", INTL[locale])}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs text-ink-faint">{m.format}</span>
          <select name="format" defaultValue={sp.format ?? ""} className={select}>
            <option value="">{m.any}</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {labels.formats[f]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs text-ink-faint">{m.language}</span>
          <select name="lang" defaultValue={sp.lang ?? ""} className={select}>
            <option value="">{m.any}</option>
            {SESSION_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {labels.languages[l]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-xs text-ink-faint">{m.when}</span>
          <select name="when" defaultValue={sp.when ?? ""} className={select}>
            <option value="">{m.whenAny}</option>
            <option value="3">{m.whenThree}</option>
            <option value="7">{m.whenWeek}</option>
          </select>
        </label>
        <div className="col-span-2 flex items-end gap-2 lg:col-span-1">
          <button className={`${buttonStyles.primary} h-11 flex-1 px-5 lg:flex-none`}>{m.apply}</button>
          <Link href="/specialists" className={`${buttonStyles.ghost} h-11 px-4`}>
            {m.reset}
          </Link>
        </div>
      </form>

      <p className="mb-4 px-1 text-sm text-ink-faint">{m.found(shown.length)}</p>
      {shown.length === 0 ? (
        <p className="rounded-[24px] border border-dashed border-line px-6 py-12 text-center text-[15px] text-ink-soft">{m.empty}</p>
      ) : (
        <ul className="stagger grid gap-4 md:grid-cols-2">
          {shown.map(({ p, next }) => (
            <li key={p.user_id} className="flex flex-col rounded-[28px] border border-line/70 bg-paper/85 p-5 shadow-soft transition hover:shadow-lift sm:p-6">
              <div className="flex items-start gap-4">
                <Avatar name={p.full_name} src={p.photo_url} size={72} />
                <div className="min-w-0 flex-1">
                  <Link href={`/p/${p.slug}`} className="font-serif text-[22px] leading-tight text-ink hover:underline">
                    {p.full_name}
                  </Link>
                  {p.headline && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-soft">{p.headline}</p>}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-sage-deep">
                    <ShieldIcon className="h-3.5 w-3.5" /> {care.verified}
                    {p.experience_years != null && <span className="text-ink-faint">· {care.years(p.experience_years)}</span>}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.specializations.slice(0, 4).map((s) => (
                  <Chip key={s} tone="bg-lilac-soft/70 text-lilac-deep">
                    {labels.specializations[s as keyof typeof labels.specializations] ?? s}
                  </Chip>
                ))}
                {p.formats.map((f) => (
                  <Chip key={f}>{labels.formats[f as keyof typeof labels.formats] ?? f}</Chip>
                ))}
              </div>
              <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {p.price != null && (
                    <p className="text-sm text-ink-soft">
                      <span className="font-serif text-[22px] text-ink">{formatPrice(p.price, p.currency, INTL[locale])}</span> · {scheduleMessages[locale].minutes(p.session_minutes)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {next ? `${m.nearest}: ${whenLabel(next.starts_at, tz, locale)}` : m.noSlots}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/p/${p.slug}`} className={`${buttonStyles.ghost} h-11 px-4`}>
                    {m.details}
                  </Link>
                  {p.accepting_clients && user?.id !== p.user_id && (
                    <Link href={`/p/${p.slug}/book`} className={`${buttonStyles.primary} h-11 px-5`}>
                      {m.book}
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  );
}
