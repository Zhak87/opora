import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { deleteDocument } from "@/lib/pro-actions";
import { getLocale } from "@/i18n/server";
import { proMessages } from "@/i18n/pro";
import { Card, PageHeader } from "@/components/ui";
import { StatusPill } from "@/components/pro/bits";
import { DocumentUpload, PhotoForm, ProfileForm } from "@/components/pro/ProfileForm";
import { TrashIcon } from "@/components/icons";

export default async function ProProfilePage() {
  const { supabase, user } = await requireUser();
  const m = proMessages[await getLocale()];
  const me = (await myPsychologist(supabase, user!.id))!;
  const [{ data: files }, { data: reviews }] = await Promise.all([
    supabase.storage.from("credentials").list(user!.id, { limit: 50, sortBy: { column: "created_at", order: "desc" } }),
    supabase.from("psychologist_reviews").select("status, note, created_at").eq("psychologist_id", me.user_id).not("note", "is", null).order("created_at", { ascending: false }).limit(1),
  ]);
  const lastNote = reviews?.[0]?.note;
  const docs = (files ?? []).filter((f) => f.name && !f.name.startsWith("."));

  return (
    <>
      <PageHeader title={m.profile.title}>{m.profile.intro}</PageHeader>
      <div className="stagger space-y-5">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={me.status} label={m.status[me.status]} />
            <p className="text-sm text-ink-soft">{m.statusHint[me.status]}</p>
          </div>
          {lastNote && (me.status === "rejected" || me.status === "suspended") && (
            <div className="mt-4 rounded-2xl bg-[#fbf1ec]/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[#a0614f]">{m.profile.reviewNote}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink">{lastNote}</p>
            </div>
          )}
        </Card>

        <Card className="p-6 sm:p-8">
          <PhotoForm name={me.full_name} photo={me.photo_url} />
        </Card>

        <Card className="p-6 sm:p-8">
          <ProfileForm p={me} />
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-[15px] font-medium text-ink">{m.profile.documents}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.profile.documentsHint}</p>
            </div>
            <DocumentUpload />
          </div>
          {docs.length ? (
            <ul className="mt-5 divide-y divide-line/70 rounded-2xl border border-line/70">
              {docs.map((f) => (
                <li key={f.name} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name.replace(/^\d+-/, "")}</span>
                  <form action={deleteDocument}>
                    <input type="hidden" name="name" value={f.name} />
                    <button aria-label={m.profile.removeDoc} title={m.profile.removeDoc} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-faint transition hover:bg-[#fbf1ec] hover:text-[#a0614f]">
                      <TrashIcon className="h-[18px] w-[18px]" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-ink-faint">{m.profile.noDocuments}</p>
          )}
        </Card>
      </div>
    </>
  );
}
