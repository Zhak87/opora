import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { isFilled } from "@/lib/intake";
import { getLocale } from "@/i18n/server";
import { intakeMessages } from "@/i18n/intake";
import { topicsPage } from "@/i18n/topics";
import { PageHeader } from "@/components/ui";
import { BackIcon } from "@/components/icons";
import { IntakeForm } from "@/components/IntakeForm";

export default async function IntakePage() {
  const locale = await getLocale();
  const m = intakeMessages[locale];
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("intake").eq("id", user!.id).maybeSingle();
  const initial = isFilled(profile?.intake) ? profile.intake : null;
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {topicsPage[locale].home}
      </Link>
      <PageHeader title={m.title}>{m.intro}</PageHeader>
      <IntakeForm initial={initial} />
    </div>
  );
}
