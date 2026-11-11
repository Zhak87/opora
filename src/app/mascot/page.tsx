import type { Metadata } from "next";
import { EMOTIONS, Orb } from "@/components/Orb";
import { ButtonLink, Card } from "@/components/ui";
import { PublicShell } from "@/components/pro/PublicShell";
import { getMsg } from "@/i18n/server";
import { mascotMessages } from "@/i18n/mascot";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getMsg(mascotMessages);
  return { title: m.metaTitle, description: m.lead };
}

// Настроение (цвет капли) для каждого выражения на витрине.
const MOOD_FOR = { calm: 3, joy: 5, wink: 4, care: 2, wow: 4, sleep: 3 } as const;

// Открытая страница о персонаже: кто он, какой у него характер и как он выглядит в разных чувствах.
export default async function MascotPage() {
  const m = await getMsg(mascotMessages);
  return (
    <PublicShell home="/welcome">
      <section className="flex flex-col items-center text-center">
        <Orb size={220} face emotion="joy" mood={4} />
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-lilac-deep">{m.eyebrow}</p>
        <h1 className="mt-2 font-serif text-[34px] leading-[1.08] text-ink sm:text-[48px]">{m.title}</h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-soft">{m.lead}</p>
      </section>

      <h2 className="mb-4 mt-14 font-display text-[20px] font-medium tracking-[-0.02em] text-ink">{m.traitsTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {m.traits.map((t) => (
          <Card key={t.title} className="p-6">
            <p className="text-[16px] font-medium text-ink">{t.title}</p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-soft">{t.text}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-14 font-display text-[20px] font-medium tracking-[-0.02em] text-ink">{m.moodsTitle}</h2>
      <p className="mb-5 mt-1 text-sm text-ink-soft">{m.moodsHint}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {EMOTIONS.map((e) => (
          <div key={e} data-emotion={e} className="flex flex-col items-center rounded-[26px] bg-paper/70 px-3 py-6 text-center shadow-soft">
            <Orb size={120} face still emotion={e} mood={MOOD_FOR[e]} />
            <p className="mt-3 text-sm text-ink">{m.emotions[e]}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <ButtonLink href="/welcome" className="h-14 px-8">{m.cta}</ButtonLink>
      </div>
    </PublicShell>
  );
}
