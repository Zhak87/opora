import Link from "next/link";
import { getLocale } from "@/i18n/server";
import { courseMessages } from "@/i18n/course";
import { Orb } from "@/components/Orb";
import { buttonStyles } from "@/components/ui";

export const metadata = { robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { u = "", t = "", status } = await searchParams;
  const m = courseMessages[await getLocale()].unsubscribe;
  const invalid = status === "invalid" || (!status && (!u || !t));
  return (
    <main className="ambient flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-md animate-rise rounded-[32px] border border-line/70 bg-paper/85 p-8 text-center shadow-soft sm:p-10">
        <Orb size={64} className="mx-auto mb-6" />
        {status === "done" ? (
          <>
            <h1 className="font-serif text-[28px] leading-tight text-ink">{m.doneTitle}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{m.doneText}</p>
          </>
        ) : invalid ? (
          <p className="text-[15px] leading-relaxed text-ink-soft">{m.invalid}</p>
        ) : (
          <>
            <h1 className="font-serif text-[28px] leading-tight text-ink">{m.title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{m.text}</p>
            <form method="post" action={`/api/email/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}`} className="mt-8">
              <button className={`${buttonStyles.primary} w-full`}>{m.button}</button>
            </form>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm text-ink-faint hover:text-ink">
          {m.open}
        </Link>
      </div>
    </main>
  );
}
