import { requireUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions";
import { NameForm, DangerZone } from "@/components/ProfileForms";
import { Card, Notice, PageHeader, buttonStyles } from "@/components/ui";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ cleared?: string; error?: string; confirm?: string }>;
}) {
  const sp = await searchParams;
  const { supabase, user } = await requireUser();
  const [{ data: profile }, { count: talks }, { count: notes }] = await Promise.all([
    supabase.from("profiles").select("name, created_at").eq("id", user!.id).single(),
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("journal_entries").select("id", { count: "exact", head: true }),
  ]);
  const since = new Date(profile?.created_at ?? Date.now()).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHeader title="Профиль" />

      <div className="stagger space-y-5">
        {sp.cleared && <Notice>История очищена.</Notice>}
        {sp.error && <Notice tone="error">Не получилось удалить аккаунт. Попробуйте ещё раз.</Notice>}
        {sp.confirm && <Notice tone="error">Чтобы удалить аккаунт, напишите слово «удалить».</Notice>}

        <Card className="p-6 sm:p-8">
          <p className="text-sm text-ink-soft">{user!.email}</p>
          <p className="mt-1 text-xs text-ink-faint">С нами с {since}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-mist/70 px-4 py-3">
              <p className="font-serif text-2xl text-ink">{talks ?? 0}</p>
              <p className="text-xs text-ink-soft">разговоров</p>
            </div>
            <div className="rounded-2xl bg-sage-soft/80 px-4 py-3">
              <p className="font-serif text-2xl text-ink">{notes ?? 0}</p>
              <p className="text-xs text-ink-soft">записей в дневнике</p>
            </div>
          </div>
          <div className="mt-8">
            <NameForm name={profile?.name ?? ""} />
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <h2 className="mb-2 text-[15px] font-medium text-ink">О приватности</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Ваши разговоры и записи видите только вы. Собеседник в приложении — это ИИ: он поддерживает и помогает
            разобраться в мыслях, но не ставит диагнозов и не заменяет специалиста. Если вам угрожает опасность,
            звоните 112.
          </p>
        </Card>

        <Card className="p-6 sm:p-8">
          <DangerZone />
        </Card>

        <form action={signOut} className="pt-2 text-center">
          <button className={buttonStyles.ghost}>Выйти из аккаунта</button>
        </form>
      </div>
    </>
  );
}
