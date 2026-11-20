import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HELP_PAGES, HELP_UI, getHelpPage } from "@/content/help";
import { HelpCta, HelpShell } from "@/components/HelpShell";
import { siteUrl } from "@/lib/seo";
import { OG_IMAGE } from "@/lib/og";

export const dynamicParams = false;
export function generateStaticParams() {
  return HELP_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = getHelpPage((await params).slug);
  if (!page) return {};
  const path = `/help/${page.slug}`;
  const languages: Record<string, string> = { [page.lang]: path };
  if (page.pair) languages[page.lang === "ru" ? "kk" : "ru"] = `/help/${page.pair}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path, languages },
    openGraph: {
      type: "article", siteName: "Опора", url: path, title: page.h1, description: page.description, images: [OG_IMAGE],
      locale: page.lang === "kk" ? "kk_KZ" : "ru_KZ",
    },
    twitter: { card: "summary_large_image", title: page.h1, description: page.description, images: [OG_IMAGE.url] },
  };
}

export default async function HelpArticle({ params }: { params: Promise<{ slug: string }> }) {
  const page = getHelpPage((await params).slug);
  if (!page) notFound();
  const ui = HELP_UI[page.lang];
  const url = new URL(`/help/${page.slug}`, siteUrl).href;
  const related = page.related.map(getHelpPage).filter((p) => p !== undefined);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: page.h1,
        description: page.description,
        inLanguage: page.lang,
        url,
        mainEntityOfPage: url,
        image: new URL(OG_IMAGE.url, siteUrl).href,
        author: { "@type": "Organization", name: "Опора", url: siteUrl.href },
        publisher: { "@type": "Organization", name: "Опора", url: siteUrl.href, logo: { "@type": "ImageObject", url: new URL("/icon.png", siteUrl).href } },
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Опора", item: siteUrl.href },
          { "@type": "ListItem", position: 2, name: ui.all, item: new URL("/help", siteUrl).href },
          { "@type": "ListItem", position: 3, name: page.h1, item: url },
        ],
      },
    ],
  };

  return (
    <HelpShell lang={page.lang} other={page.pair ? `/help/${page.pair}` : undefined}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-6 text-sm text-ink-faint">
        <Link href="/help" className="hover:text-ink">{ui.all}</Link>
      </nav>
      <article>
        <h1 className="font-serif text-[32px] leading-[1.1] text-ink sm:text-[46px]">{page.h1}</h1>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{page.lead}</p>
        <div className="mt-8"><HelpCta lang={page.lang} primary={page.cta} /></div>

        {page.sections.map((s) => (
          <section key={s.h} className="mt-12">
            <h2 className="font-serif text-[24px] text-ink sm:text-[28px]">{s.h}</h2>
            {s.p?.map((t) => <p key={t} className="mt-4 text-[16px] leading-relaxed text-ink-soft">{t}</p>)}
            {s.list && (
              <ul className="mt-4 flex flex-col gap-2.5">
                {s.list.map((t) => (
                  <li key={t} className="flex gap-3 text-[16px] leading-relaxed text-ink-soft">
                    <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lilac-deep" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-14">
          <h2 className="font-serif text-[24px] text-ink sm:text-[28px]">{ui.faq}</h2>
          <div className="mt-5 flex flex-col gap-3">
            {page.faq.map((f) => (
              <details key={f.q} className="group rounded-3xl bg-paper/80 px-6 py-4 shadow-soft">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-xl leading-none text-ink-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-12 rounded-3xl bg-mist/60 px-6 py-5 text-[15px] leading-relaxed text-ink-soft">
          <p>{ui.note}</p>
          <p className="mt-1 font-medium text-ink">{ui.crisis}</p>
        </div>
        <div className="mt-8"><HelpCta lang={page.lang} primary={page.cta} /></div>
      </article>

      {related.length > 0 && (
        <nav className="mt-16">
          <h2 className="font-serif text-[22px] text-ink">{ui.related}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/help/${r.slug}`} className="block h-full rounded-3xl bg-paper/80 px-5 py-4 text-[15px] font-medium text-ink shadow-soft transition hover:shadow-lift">
                  {r.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </HelpShell>
  );
}
