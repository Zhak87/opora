import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, buttonStyles } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { requireUser } from "@/lib/supabase/server";
import { SLUG_RE, myPsychologist } from "@/lib/pro";
import { shareMessages } from "@/i18n/share";
import { publicMetadata, siteUrl } from "@/lib/seo";
import { Avatar } from "@/components/pro/bits";
import { createPsychologist } from "@/lib/pro-actions";
import { getMsg } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { common } from "@/i18n/common";
import { cabinetMessages } from "@/i18n/cabinet";
import { proLandingMessages } from "@/i18n/pro-landing";
import { ProSignupForm } from "@/components/pro/ProSignupForm";
import { Parallax } from "@/components/pro/Parallax";
import { CalendarIcon, CheckIcon, LinkIcon, PenIcon, ShieldIcon, SparkIcon, TalkIcon, TodayIcon, UsersIcon } from "@/components/icons";

export async function generateMetadata(): Promise<Metadata> {
  const m = (await getMsg(proLandingMessages)).seo;
  return publicMetadata("/pro/join", m.title, m.description);
}

// Градиент Опи: единственное цветное пятно бренда, только как мягкое свечение фона.
const GLOW = "bg-[linear-gradient(140deg,#A9B4FF_0%,#C7B2F5_52%,#FFC9B5_100%)]";
const FEATURE_ICONS = [PenIcon, ShieldIcon, CheckIcon, TalkIcon, SparkIcon, CalendarIcon, UsersIcon, TodayIcon];
const card = "rounded-[28px] bg-paper shadow-soft";
const eyebrow = "mb-3 text-xs font-medium uppercase tracking-[0.16em] text-lilac-deep";
const h2 = "font-serif text-[28px] leading-[1.15] text-ink sm:text-[40px]";

// Лендинг для психологов: что даёт кабинет, как пригласить клиентов и регистрация прямо на странице.
// ?from=<slug> — ссылка от коллеги: показываем, кто пригласил, и сохраняем это через регистрацию.
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { supabase, user } = await requireUser();
  const { data: inviter } =
    from && SLUG_RE.test(from)
      ? await supabase.from("psychologists").select("full_name, photo_url, headline").eq("slug", from).eq("status", "approved").maybeSingle()
      : { data: null };
  const back = inviter ? `/pro/join?from=${from}` : "/pro/join";
  const sm = await getMsg(shareMessages);
  const own = user ? await myPsychologist(supabase, user.id) : null;
  const pm = await getMsg(proMessages);
  const pj = (await getMsg(cabinetMessages)).proJoin;
  const m = await getMsg(proLandingMessages);
  const c = await getMsg(common);
  const k = m.mock;
  const cta = own ? "/pro" : "#signup";
  const ctaLabel = own ? pm.join.continue : m.hero.cta;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: m.seo.title,
      description: m.seo.description,
      url: new URL("/pro/join", siteUrl).href,
      isPartOf: { "@type": "WebSite", name: "Опора", url: siteUrl.origin },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: m.faq.items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <div className="min-h-dvh overflow-x-clip bg-milk" data-pro-landing-page>
      <Parallax />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <header className="sticky top-0 z-40 border-b border-line/60 bg-milk/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-5 py-3 sm:px-8">
          <Link href={user ? "/" : "/welcome"} className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/opi-joy.webp" alt="" width={34} height={34} className="h-[34px] w-[34px]" />
            <span className="hidden font-display text-[19px] font-semibold lowercase tracking-[-0.03em] text-ink sm:inline">{c.brand}</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:block">
              <LanguageSwitcher />
            </span>
            {!user && (
              <span className="hidden sm:block">
                <ButtonLink href={`/login?next=${encodeURIComponent(back)}`} variant="ghost" className="h-10 px-4">
                  {m.hero.signIn}
                </ButtonLink>
              </span>
            )}
            <a href={cta} className={`${buttonStyles.primary} h-10 whitespace-nowrap px-3.5 text-[13px] sm:px-4 sm:text-sm`}>
              {ctaLabel}
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Первый экран: обещание и «живые» карточки кабинета вокруг Опи */}
        <section className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
          <div className="relative z-10 animate-rise">
            {inviter && !own && (
              <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-paper py-1.5 pl-1.5 pr-5 shadow-soft">
                <Avatar name={inviter.full_name} src={inviter.photo_url} size={36} />
                <span className="text-sm text-ink">{sm.invitedBy(inviter.full_name)}</span>
              </div>
            )}
            <h1>
              <span className={`block ${eyebrow}`}>{m.seo.h1}</span>
              <span className="block font-serif text-[36px] leading-[1.08] text-ink sm:text-[56px]">{m.hero.title}</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">{m.hero.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={cta} className={`${buttonStyles.primary} h-14 px-8`} data-hero-cta>
                {ctaLabel}
              </a>
              <a href="#day" className={`${buttonStyles.soft} h-14 px-8`}>
                {m.hero.how}
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              {m.hero.badges.map((b) => (
                <li key={b} className="flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 text-[13px] text-ink-soft shadow-soft">
                  <CheckIcon className="h-3.5 w-3.5 text-lilac-deep" /> {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto h-[400px] w-full max-w-[520px] sm:h-[520px]" aria-hidden>
            <div className="absolute inset-0">
              <div data-parallax="0.06" className={`absolute left-[8%] top-[6%] h-[78%] w-[84%] rounded-full opacity-60 blur-3xl ${GLOW}`} />
            </div>
            <div className="absolute inset-0">
              <div data-parallax="-0.1" className="absolute left-[18%] top-[16%] w-[64%] sm:left-[20%] sm:top-[8%] sm:w-[60%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/opi-joy.webp" alt="" width={720} height={720} className="mx-auto h-auto w-full animate-float drop-shadow-[0_30px_40px_rgba(108,99,255,0.25)]" fetchPriority="high" />
              </div>
            </div>
            <div className="absolute inset-0">
              <div data-parallax="0.16" className={`absolute left-0 top-0 w-[230px] p-4 ${card}`}>
                <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">{k.sessions}</p>
                {[0, 1].map((i) => (
                  <div key={i} className="mt-2.5 flex items-center gap-3">
                    <span className="font-serif text-[15px] text-ink">{i ? "16:30" : "11:00"}</span>
                    <span className="min-w-0 flex-1 text-sm text-ink">
                      {k.names[i]} <span className="text-ink-faint">· {i ? k.offline : k.online}</span>
                    </span>
                    {!i && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] text-paper">{k.join}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0">
              <div data-parallax="-0.2" className={`absolute bottom-0 right-0 w-[236px] p-4 ${card}`}>
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink-faint">
                  <ShieldIcon className="h-3.5 w-3.5" /> {k.note} · {k.onlyYou}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink">{k.noteText}</p>
              </div>
            </div>
            <div className="absolute inset-0">
              <div data-parallax="0.26" className={`absolute bottom-[24%] left-0 hidden w-[240px] p-4 sm:block ${card}`}>
                <p className="flex items-center justify-between gap-2 text-sm text-ink">
                  {k.task}
                  <span className="rounded-full bg-lilac-soft px-2 py-0.5 text-[11px] text-lilac-deep">{k.done}</span>
                </p>
                <p className="mt-1.5 text-[13px] text-ink-soft">
                  {k.names[0]}: {k.reply}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Рабочий день: макет экрана «Сегодня» */}
        <section id="day" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div data-reveal>
              <p className={eyebrow}>{k.today}</p>
              <h2 className={h2}>{m.day.title}</h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{m.day.text}</p>
              <ul className="mt-6 space-y-3">
                {m.day.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lilac-soft text-lilac-deep">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative" aria-hidden>
              <div className="absolute inset-0">
                <div data-parallax="0.08" className={`absolute -right-6 top-10 h-64 w-64 rounded-full opacity-40 blur-3xl ${GLOW}`} />
              </div>
              <div data-reveal className={`relative p-5 sm:p-7 ${card} rounded-[32px] shadow-lift`}>
                <p className="font-serif text-[22px] text-ink">{k.today}</p>
                <p className="mb-2 mt-4 text-xs text-ink-faint">{k.sessions}</p>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="mb-2 flex items-center gap-3 rounded-2xl bg-milk px-4 py-3">
                    <span className="w-12 font-serif text-[15px] text-ink">{["11:00", "14:00", "16:30"][i]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink">{k.names[i]}</span>
                      <span className="block text-xs text-ink-faint">{i === 2 ? k.offline : k.online}</span>
                    </span>
                    {i === 0 ? (
                      <span className="rounded-full bg-lilac-soft px-2.5 py-1 text-[11px] text-lilac-deep">{k.paid}</span>
                    ) : i === 1 ? (
                      <span className="rounded-full bg-ink px-3 py-1 text-[11px] text-paper">{k.join}</span>
                    ) : null}
                  </div>
                ))}
                <p className="mb-2 mt-5 text-xs text-ink-faint">{k.toRecord}</p>
                <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
                  <span className="flex-1 text-sm text-ink">{k.names[0]} · 11:00</span>
                  <span className="text-sm text-lilac-deep">{k.record}</span>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 hidden sm:block">
                <div data-parallax="-0.14" className={`absolute -left-10 bottom-8 w-[230px] p-4 ${card} shadow-lift`}>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">{k.newMessage}</p>
                  <p className="mt-1.5 text-sm text-ink">
                    {k.names[1]}: {k.messageText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* После встречи: три уровня записи */}
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center" data-reveal>
            <h2 className={h2}>{m.record.title}</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{m.record.text}</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3" aria-hidden>
            {[
              { speed: "0.05", label: k.note, tag: k.onlyYou, text: k.noteText, Icon: ShieldIcon },
              { speed: "-0.05", label: k.summary, tag: k.forClient, text: k.summaryText, Icon: TalkIcon },
              { speed: "0.05", label: k.task, tag: k.done, text: `${k.names[0]}: ${k.reply}`, Icon: CheckIcon },
            ].map(({ speed, label, tag, text, Icon }, i) => (
              <div key={label} className="md:py-6">
                <div data-parallax={speed}>
                  <div data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }} className={`h-full p-6 ${card} rounded-[32px]`}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac-soft text-lilac-deep">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-5 text-[17px] font-medium text-ink">{label}</p>
                    <p className="mt-1 inline-flex rounded-full bg-milk px-2.5 py-1 text-xs text-ink-soft">{tag}</p>
                    <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Все возможности */}
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <h2 className={`${h2} max-w-2xl`} data-reveal>
            {m.features.title}
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-features>
            {m.features.items.map(([title, text], i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
              return (
                <li key={title} data-reveal style={{ ["--reveal-delay" as string]: `${(i % 4) * 70}ms` }} className={`p-6 ${card} transition duration-300 hover:-translate-y-1 hover:shadow-lift`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lilac-soft text-lilac-deep">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-[16px] font-medium leading-snug text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Приглашение клиентов: тёмный блок */}
        <section className="px-3 py-10 sm:px-6">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[40px] bg-ink px-6 py-14 text-paper sm:px-12 lg:py-20">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <div data-parallax="0.12" className={`absolute -right-24 -top-10 h-96 w-96 rounded-full opacity-30 blur-3xl ${GLOW}`} />
            </div>
            <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
              <div data-reveal>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-lilac">{m.invite.eyebrow}</p>
                <h2 className="font-serif text-[28px] leading-[1.15] sm:text-[40px]">{m.invite.title}</h2>
                <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-paper/70">{m.invite.text}</p>
                <div className="mt-7 inline-flex max-w-full items-center gap-3 rounded-full bg-paper/10 py-2 pl-4 pr-2 backdrop-blur">
                  <LinkIcon className="h-4 w-4 shrink-0 text-lilac" />
                  <span className="truncate text-sm text-paper">{m.invite.link}</span>
                  <a href={cta} className="shrink-0 rounded-full bg-lilac-deep px-4 py-2 text-sm font-medium text-paper transition hover:bg-lilac">
                    {ctaLabel}
                  </a>
                </div>
              </div>
              <ul className="space-y-3">
                {m.invite.points.map(([title, text], i) => (
                  <li key={title} data-reveal style={{ ["--reveal-delay" as string]: `${i * 90}ms` }} className="rounded-[24px] bg-paper/[0.07] p-5 ring-1 ring-paper/10">
                    <h3 className="text-[16px] font-medium text-paper">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/65">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Личное пространство психолога */}
        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className={`relative flex flex-col items-center gap-8 overflow-hidden p-8 text-center sm:flex-row sm:p-12 sm:text-left ${card} rounded-[36px]`} data-reveal>
            <div className="relative h-36 w-36 shrink-0" aria-hidden>
              <div className={`absolute inset-2 rounded-full opacity-50 blur-2xl ${GLOW}`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/opi-hero-34.webp" alt="" width={696} height={720} loading="lazy" className="relative h-full w-full animate-float" />
            </div>
            <div>
              <h2 className="font-serif text-[24px] leading-tight text-ink sm:text-[30px]">{m.self.title}</h2>
              <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-soft">{m.self.text}</p>
            </div>
          </div>
        </section>

        {/* Шаги и регистрация */}
        <section id="signup" className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_440px] lg:gap-14">
            <div data-reveal>
              <p className={eyebrow}>{m.stepsEyebrow}</p>
              <h2 className={h2}>{pj.stepsTitle}</h2>
              <ol className="mt-8 space-y-3" data-pro-steps>
                {pj.steps.map(([title, text], i) => (
                  <li key={title} className={`flex gap-4 p-5 ${card} rounded-[24px]`}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-serif text-[16px] text-paper">{i + 1}</span>
                    <span>
                      <span className="block text-[16px] font-medium text-ink">{title}</span>
                      <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-ink-soft">{pj.aiNote}</p>
            </div>

            <aside className="rounded-[32px] bg-paper p-7 shadow-lift sm:p-9 lg:sticky lg:top-24" data-pro-join-card>
              {own ? (
                <div data-pro-status={own.status}>
                  <p className="mb-3 inline-flex rounded-full bg-lilac-soft px-3 py-1 text-xs font-medium text-lilac-deep">{pj.status[own.status]}</p>
                  <p className="text-[15px] leading-relaxed text-ink-soft">{pm.statusHint[own.status]}</p>
                  <div className="mt-6 flex flex-col gap-2">
                    <ButtonLink href="/pro">{pm.join.continue}</ButtonLink>
                    {own.status !== "approved" && (
                      <ButtonLink href="/pro/profile" variant="soft">
                        {pj.openProfile}
                      </ButtonLink>
                    )}
                  </div>
                </div>
              ) : user ? (
                <form action={createPsychologist}>
                  <h2 className="font-serif text-[24px] leading-tight text-ink">{pj.formTitle}</h2>
                  <p className="mb-6 mt-2 text-sm leading-relaxed text-ink-soft">{pj.existing}</p>
                  <SubmitButton className="w-full">{pm.join.start}</SubmitButton>
                </form>
              ) : (
                <ProSignupForm next={back} />
              )}
            </aside>
          </div>
        </section>

        {/* Вопросы */}
        <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 lg:py-24">
          <h2 className={`${h2} text-center`} data-reveal>
            {m.faq.title}
          </h2>
          <div className="mt-10 space-y-3" data-faq>
            {m.faq.items.map(([q, a]) => (
              <details key={q} className={`group p-5 sm:p-6 ${card} rounded-[24px]`} data-reveal>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  <h3>{q}</h3>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-milk text-lg text-ink-soft transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Финальный призыв */}
        <section className="px-5 pb-20 pt-6 text-center sm:px-8" data-reveal>
          <h2 className={h2}>{m.final.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">{m.final.text}</p>
          <a href={cta} className={`${buttonStyles.primary} mt-8 h-14 px-10`}>
            {ctaLabel}
          </a>
        </section>
      </main>

      <footer className="border-t border-line/70 px-5 py-8 text-center text-sm text-ink-soft">
        <div className="mb-5 flex justify-center sm:hidden">
          <LanguageSwitcher />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/welcome" className="hover:text-ink">{m.footer.home}</Link>
          <Link href="/specialists" className="hover:text-ink">{m.footer.catalog}</Link>
          <Link href="/privacy" className="hover:text-ink">{m.footer.privacy}</Link>
          <Link href="/terms" className="hover:text-ink">{m.footer.terms}</Link>
        </nav>
      </footer>
    </div>
  );
}
