import type { Session } from "@/lib/sessions";
import { setSessionNoShow, setSessionPaid } from "@/lib/cabinet-actions";
import type { Locale } from "@/i18n/config";
import { cabinetMessages } from "@/i18n/cabinet";
import { ConfirmForm } from "../ConfirmForm";
import { CheckIcon } from "../icons";

// Отметки психолога у встречи: оплата вручную и «клиент не пришёл».

export function PaidToggle({ session, locale, compact = false }: { session: Pick<Session, "id" | "payment_status">; locale: Locale; compact?: boolean }) {
  const m = cabinetMessages[locale].pay;
  const paid = session.payment_status === "paid";
  return (
    <form action={setSessionPaid} data-paid={paid ? "1" : "0"}>
      <input type="hidden" name="session" value={session.id} />
      <input type="hidden" name="paid" value={paid ? "0" : "1"} />
      <button
        title={paid ? m.unmark : m.markPaid}
        className={`inline-flex items-center gap-1.5 rounded-full text-xs transition ${compact ? "h-7 px-2.5" : "h-9 px-3.5 text-sm"} ${
          paid ? "bg-sage-soft text-sage-deep hover:bg-sage-soft/70" : "border border-line text-ink-soft hover:border-sand-deep hover:text-ink"
        }`}
      >
        {paid && <CheckIcon className="h-3.5 w-3.5" />}
        {paid ? m.paid : compact ? m.unpaid : m.markPaid}
      </button>
    </form>
  );
}

export function NoShowToggle({ session, locale }: { session: Pick<Session, "id" | "no_show">; locale: Locale }) {
  const m = cabinetMessages[locale].attend;
  if (session.no_show) {
    return (
      <form action={setSessionNoShow}>
        <input type="hidden" name="session" value={session.id} />
        <input type="hidden" name="no_show" value="0" />
        <button className="h-9 rounded-full px-3.5 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline">{m.unmark}</button>
      </form>
    );
  }
  return (
    <ConfirmForm action={setSessionNoShow} question={m.confirm} hidden={{ session: session.id, no_show: "1" }}>
      <button className="h-9 rounded-full border border-line px-3.5 text-sm text-ink-soft transition hover:border-sand-deep hover:text-ink" data-no-show>
        {m.markNoShow}
      </button>
    </ConfirmForm>
  );
}
