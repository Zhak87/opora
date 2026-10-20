import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { myPsychologist } from "@/lib/pro";
import { deleteTimeOff } from "@/lib/session-actions";
import { dayLabel } from "@/lib/time";
import { getLocale } from "@/i18n/server";
import { scheduleMessages } from "@/i18n/schedule";
import { common } from "@/i18n/common";
import { Card, PageHeader } from "@/components/ui";
import { AvailabilityForm, BookingSettingsForm, TimeOffForm } from "@/components/schedule/ProForms";
import { BackIcon, TrashIcon } from "@/components/icons";

type Psy = { buffer_minutes: number; booking_notice_hours: number; booking_horizon_days: number };

export default async function ScheduleSettings() {
  const { supabase, user } = await requireUser();
  const locale = await getLocale();
  const m = scheduleMessages[locale].pro;
  const me = (await myPsychologist(supabase, user!.id))! as Awaited<ReturnType<typeof myPsychologist>> & Psy;
  const [{ data: hours }, { data: off }] = await Promise.all([
    supabase.from("availability").select("weekday, start_min, end_min").eq("psychologist_id", me.user_id).order("start_min"),
    supabase.from("time_off").select("id, starts_at, ends_at, note").eq("psychologist_id", me.user_id).gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  const initial: Record<number, { start_min: number; end_min: number }[]> = {};
  for (const h of hours ?? []) (initial[h.weekday] ??= []).push(h);

  return (
    <>
      <Link href="/pro/schedule" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
        <BackIcon className="h-4 w-4" /> {common[locale].back}
      </Link>
      <PageHeader title={m.hours}>{m.hoursHint}</PageHeader>
      <div className="stagger space-y-5">
        <Card className="p-6 sm:p-7">
          <AvailabilityForm initial={initial} />
        </Card>
        <Card className="p-6 sm:p-7">
          <h2 className="mb-4 text-[15px] font-medium text-ink">{m.settings}</h2>
          <BookingSettingsForm tz={me.timezone} buffer={me.buffer_minutes} notice={me.booking_notice_hours} horizon={me.booking_horizon_days} />
        </Card>
        <Card className="p-6 sm:p-7">
          <h2 className="text-[15px] font-medium text-ink">{m.timeOff}</h2>
          <p className="mb-4 mt-1 text-sm text-ink-soft">{m.timeOffHint}</p>
          <TimeOffForm tz={me.timezone} />
          <ul className="mt-5 space-y-2">
            {(off ?? []).length === 0 && <li className="text-sm text-ink-faint">{m.noTimeOff}</li>}
            {(off ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-sand/40 px-4 py-2.5 text-sm">
                <span className="flex-1 text-ink">
                  {dayLabel(t.starts_at, me.timezone, locale, false)} — {dayLabel(new Date(Date.parse(t.ends_at) - 1), me.timezone, locale, false)}
                  {t.note && <span className="text-ink-faint"> · {t.note}</span>}
                </span>
                <form action={deleteTimeOff}>
                  <input type="hidden" name="id" value={t.id} />
                  <button aria-label={m.remove} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint hover:bg-[#fbf1ec] hover:text-[#a0614f]">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
