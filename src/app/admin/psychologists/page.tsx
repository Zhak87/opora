import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { isAdmin, type Psychologist, type PsyStatus } from "@/lib/pro";
import { reviewPsychologist } from "@/lib/pro-actions";
import { INTL } from "@/i18n/config";
import { getLocale } from "@/i18n/server";
import { adminMessages } from "@/i18n/care";
import { proLabels, proMessages } from "@/i18n/pro";
import { PublicShell } from "@/components/pro/PublicShell";
import { Avatar, Chip, StatusPill } from "@/components/pro/bits";
import { Card, PageHeader } from "@/components/ui";

const TABS: PsyStatus[] = ["pending", "approved", "rejected", "suspended", "draft"];

// Проверка анкет психологов. Доступ проверяет база: review_psychologist откажет не-администратору.
export default async function AdminPsychologists({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const status = (TABS as string[]).includes(raw ?? "") ? (raw as PsyStatus) : "pending";
  const { supabase } = await requireUser();
  const locale = await getLocale();
  const m = adminMessages[locale];
  const pro = proMessages[locale];
  const labels = proLabels[locale];

  if (!(await isAdmin(supabase))) {
    return (
      <PublicShell home="/">
        <p className="pt-10 text-center text-[15px] text-ink-soft">{m.forbidden}</p>
      </PublicShell>
    );
  }

  const { data } = await supabase.from("psychologists").select("*").eq("status", status).order("submitted_at", { ascending: true, nullsFirst: false }).limit(50);
  const list = (data ?? []) as Psychologist[];
  const docs = await Promise.all(
    list.map(async (p) => {
      const { data: files } = await supabase.storage.from("credentials").list(p.user_id, { limit: 20 });
      const named = (files ?? []).filter((f) => f.name && !f.name.startsWith("."));
      if (!named.length) return [];
      const { data: signed } = await supabase.storage.from("credentials").createSignedUrls(named.map((f) => `${p.user_id}/${f.name}`), 600);
      return named.map((f, i) => ({ name: f.name.replace(/^\d+-/, ""), url: signed?.[i]?.signedUrl ?? "" }));
    }),
  );

  return (
    <PublicShell home="/">
      <PageHeader title={m.title}>{m.intro}</PageHeader>
      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/psychologists?status=${t}`}
            className={`rounded-full px-4 py-2 text-sm transition ${t === status ? "bg-ink text-paper" : "bg-paper text-ink-soft hover:text-ink"}`}
          >
            {m.tabs[t]}
          </Link>
        ))}
      </nav>
      {list.length === 0 && <p className="rounded-[24px] border border-dashed border-line px-6 py-10 text-center text-ink-soft">{m.empty}</p>}
      <div className="space-y-5">
        {list.map((p, i) => (
          <Card key={p.user_id} className="p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <Avatar name={p.full_name} src={p.photo_url} size={56} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[17px] font-medium text-ink">{p.full_name || "—"}</p>
                  <StatusPill status={p.status} label={pro.status[p.status]} />
                </div>
                <p className="text-sm text-ink-soft">{p.headline}</p>
                {p.submitted_at && (
                  <p className="mt-1 text-xs text-ink-faint">
                    {m.submitted}: {new Date(p.submitted_at).toLocaleString(INTL[locale])}
                  </p>
                )}
              </div>
              <Link href={`/p/${p.slug}`} className="shrink-0 text-sm text-sky-deep hover:text-ink">
                /p/{p.slug}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {p.specializations.map((s) => (
                <Chip key={s}>{labels.specializations[s as keyof typeof labels.specializations] ?? s}</Chip>
              ))}
            </div>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-ink-faint">{pro.profile.education}</p>
                {p.education.map((e, j) => (
                  <p key={j} className="text-ink">{[e.institution, e.degree, e.year].filter(Boolean).join(", ")}</p>
                ))}
                <p className="mt-1 text-ink-soft">{pro.profile.experience}: {p.experience_years ?? "—"}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.12em] text-ink-faint">{m.documents}</p>
                {docs[i].length ? (
                  docs[i].map((d) => (
                    <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sky-deep hover:text-ink">
                      {d.name}
                    </a>
                  ))
                ) : (
                  <p className="text-[#a0614f]">{m.noDocuments}</p>
                )}
              </div>
            </div>
            <form action={reviewPsychologist} className="mt-5 space-y-3">
              <input type="hidden" name="user" value={p.user_id} />
              <textarea
                name="note"
                rows={2}
                maxLength={2000}
                placeholder={m.note}
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none focus:border-sky focus:ring-4 focus:ring-mist"
              />
              <div className="flex flex-wrap gap-2">
                {p.status !== "approved" && (
                  <button name="status" value="approved" className="h-10 rounded-full bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90">{m.approve}</button>
                )}
                {p.status !== "rejected" && (
                  <button name="status" value="rejected" className="h-10 rounded-full border border-line bg-paper px-5 text-sm text-ink hover:border-sand-deep">{m.reject}</button>
                )}
                {p.status !== "suspended" && (
                  <button name="status" value="suspended" className="h-10 rounded-full px-5 text-sm text-[#a0614f] hover:bg-[#fbf1ec]">{m.suspend}</button>
                )}
              </div>
            </form>
          </Card>
        ))}
      </div>
    </PublicShell>
  );
}
