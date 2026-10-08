import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { greeting, relativeDate } from "@/lib/format";
import { DAILY_QUESTIONS, pickForDay } from "@/lib/content";
import { Orb } from "@/components/Orb";
import { StartForm } from "@/components/StartForm";
import { TalkIcon, CompassIcon, PenIcon, ArrowIcon } from "@/components/icons";

export default async function HomePage() {
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("name").eq("id", user!.id).single(),
    supabase.from("conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(3),
  ]);
  const question = pickForDay(DAILY_QUESTIONS);
  const name = profile?.name;

  return (
    <div className="stagger">
      <section className="mb-10 flex items-center gap-5 pr-10 sm:mb-14 sm:gap-7 md:pr-0">
        <Orb size={72} className="sm:hidden" />
        <Orb size={104} className="hidden sm:block" />
        <div>
          <p className="text-[15px] text-ink-soft">
            {greeting()}
            {name ? `, ${name}` : ""}
          </p>
          <h1 className="mt-1 font-serif text-[28px] leading-tight text-ink sm:text-[38px]">Как вы сегодня?</h1>
        </div>
      </section>

      <section className="mb-10 grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StartForm className="group flex w-full items-center gap-4 rounded-[28px] bg-ink p-5 text-left text-paper shadow-lift transition-all duration-300 hover:-translate-y-0.5 sm:flex-col sm:items-start sm:p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/10">
            <TalkIcon className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block text-[17px] font-medium">Поговорить</span>
            <span className="mt-0.5 block text-sm text-paper/60">Просто рассказать, что на душе</span>
          </span>
        </StartForm>
        <ActionLink href="/explore" title="Разобраться в себе" hint="Выбрать, что тревожит" tone="bg-mist" Icon={CompassIcon} />
        <ActionLink href="/journal" title="Записать мысли" hint="Личный дневник" tone="bg-sage-soft" Icon={PenIcon} />
      </section>

      <Link
        href="/play"
        className="group mb-10 flex items-center gap-5 overflow-hidden rounded-[28px] border border-line/70 bg-gradient-to-r from-mist/80 via-paper to-sage-soft/80 p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-6"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
          <span className="absolute h-14 w-14 animate-breathe rounded-full bg-lilac-soft" />
          <span className="absolute h-8 w-8 animate-breathe rounded-full bg-paper [animation-delay:-3s]" />
        </span>
        <span className="flex-1">
          <span className="block text-[17px] font-medium text-ink">Игры и практики</span>
          <span className="mt-0.5 block text-sm text-ink-soft">Успокоиться или узнать о себе что-то новое</span>
        </span>
        <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>

      <section className="mb-10 rounded-[28px] border border-line/70 bg-gradient-to-br from-paper to-lilac-soft/50 p-6 shadow-soft sm:p-8">
        <p className="mb-3 text-xs uppercase tracking-[0.14em] text-lilac-deep">Вопрос дня</p>
        <p className="font-serif text-[22px] leading-snug text-ink sm:text-[26px]">{question}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/journal?q=${encodeURIComponent(question)}`}
            className="rounded-full bg-paper px-4 py-2 text-sm text-ink shadow-soft transition hover:shadow-lift"
          >
            Ответить в дневнике
          </Link>
          <StartForm
            prompt={`Вопрос дня: «${question}». Хочу об этом подумать.`}
            className="rounded-full px-4 py-2 text-sm text-ink-soft transition hover:bg-paper/70 hover:text-ink"
          >
            Обсудить
          </StartForm>
        </div>
      </section>

      {recent && recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-[15px] text-ink-soft">Продолжить разговор</h2>
            <Link href="/talk" className="text-sm text-ink-faint hover:text-ink">Все</Link>
          </div>
          <ul className="divide-y divide-line/70 overflow-hidden rounded-[24px] border border-line/70 bg-paper/70">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/talk/${c.id}`} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-sand/40">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{c.title}</span>
                    <span className="text-xs text-ink-faint">{relativeDate(c.updated_at)}</span>
                  </span>
                  <ArrowIcon className="h-4 w-4 text-ink-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ActionLink({
  href,
  title,
  hint,
  tone,
  Icon,
}: {
  href: string;
  title: string;
  hint: string;
  tone: string;
  Icon: (p: { className?: string }) => React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[28px] border border-line/70 bg-paper/80 p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:flex-col sm:items-start sm:p-6"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone} text-ink`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="flex-1">
        <span className="block text-[17px] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>
      </span>
    </Link>
  );
}
