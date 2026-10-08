import { Orb } from "@/components/Orb";
import { ButtonLink } from "@/components/ui";
import { MusicToggle } from "@/components/Music";

const FEELINGS = ["спокойствие", "безопасность", "тепло", "надежда"];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="font-serif text-xl text-ink">Опора</span>
        <div className="flex items-center gap-2">
          <MusicToggle withLabel className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline sm:pr-2" />
          <ButtonLink href="/login" variant="ghost" className="h-10 px-4">Войти</ButtonLink>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-16 text-center sm:px-8">
        {deleted && (
          <p className="mb-8 rounded-full bg-paper/80 px-5 py-2 text-sm text-ink-soft shadow-soft">
            Аккаунт и все данные удалены. Берегите себя.
          </p>
        )}
        <Orb size={180} className="mb-10 animate-fade" />
        <h1 className="max-w-2xl animate-rise font-serif text-[38px] leading-[1.15] text-ink sm:text-[56px]">
          Место, где можно остановиться
        </h1>
        <p className="mt-6 max-w-lg animate-rise text-[17px] leading-relaxed text-ink-soft [animation-delay:120ms]">
          Выговориться, спокойно разобраться в себе и найти следующий небольшой шаг. Рядом — внимательный собеседник,
          который просто слушает.
        </p>
        <div className="mt-10 flex w-full max-w-xs animate-rise flex-col gap-3 [animation-delay:220ms] sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink href="/signup">Начать</ButtonLink>
          <ButtonLink href="/login" variant="soft">У меня есть аккаунт</ButtonLink>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-ink-faint animate-fade [animation-delay:400ms]">
          {FEELINGS.map((f, i) => (
            <span key={f} className="flex items-center gap-3">
              {i > 0 && <span className="h-px w-6 bg-line" />}
              {f}
            </span>
          ))}
        </div>
      </main>

      <footer className="px-5 pb-8 text-center text-xs leading-relaxed text-ink-faint">
        Опора не заменяет помощь специалиста. Если вам угрожает опасность, звоните 112.
      </footer>
    </div>
  );
}
