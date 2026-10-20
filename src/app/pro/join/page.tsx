import Link from "next/link";
import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { createPsychologist } from "@/lib/pro-actions";
import { getMsg } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { common } from "@/i18n/common";

// Страница для специалистов: что даёт кабинет и как начать. Открыта и без входа.
export default async function JoinPage() {
  const { supabase, user } = await requireUser();
  const own = user ? await myPsychologist(supabase, user.id) : null;
  const m = (await getMsg(proMessages)).join;
  const c = await getMsg(common);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href={user ? "/" : "/welcome"} className="flex items-center gap-3">
          <Orb size={32} still />
          <span className="font-serif text-xl text-ink">{c.brand}</span>
        </Link>
        <LanguageSwitcher />
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-6 sm:px-8 sm:pt-12">
        <section className="max-w-2xl animate-rise">
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-lilac-deep">{m.eyebrow}</p>
          <h1 className="font-serif text-[36px] leading-[1.12] text-ink sm:text-[52px]">{m.title}</h1>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{m.lead}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {own ? (
              <ButtonLink href="/pro">{m.continue}</ButtonLink>
            ) : user ? (
              <form action={createPsychologist}>
                <SubmitButton className="w-full sm:w-auto">{m.start}</SubmitButton>
              </form>
            ) : (
              <>
                <ButtonLink href="/signup?next=/pro/join">{m.signup}</ButtonLink>
                <ButtonLink href="/login?next=/pro/join" variant="soft">{m.signin}</ButtonLink>
              </>
            )}
          </div>
          {!user && <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-faint">{m.needAccount}</p>}
        </section>

        <section className="stagger mt-14 grid gap-4 sm:grid-cols-2">
          {m.points.map(([title, text], i) => (
            <div
              key={title}
              className={`rounded-[28px] border border-line/70 p-6 shadow-soft ${
                ["bg-gradient-to-br from-paper to-mist/70", "bg-gradient-to-br from-paper to-sage-soft/70", "bg-gradient-to-br from-paper to-lilac-soft/70", "bg-gradient-to-br from-paper to-sand/80"][i % 4]
              }`}
            >
              <p className="text-[17px] font-medium text-ink">{title}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
