import Link from "next/link";
import { getTopics } from "@/lib/topics";
import { getLocale } from "@/i18n/server";
import { courseMessages } from "@/i18n/course";
import { PageHeader } from "@/components/ui";
import { BackIcon } from "@/components/icons";
import { CourseIntake } from "@/components/course/CourseIntake";

export const maxDuration = 60;

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const locale = await getLocale();
  const t = courseMessages[locale];
  const { topic } = await searchParams;
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {t.overview.back}
      </Link>
      <PageHeader eyebrow={t.intake.eyebrow} title={t.intake.title}>
        {t.intake.lead}
      </PageHeader>
      <CourseIntake
        topics={getTopics(locale).map((x) => ({ slug: x.slug, title: x.title }))}
        initialTopic={topic}
      />
    </>
  );
}
