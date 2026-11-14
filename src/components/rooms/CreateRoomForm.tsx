"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type ComponentType } from "react";
import { createRoom } from "@/lib/rooms/actions";
import { useMsg } from "@/i18n/client";
import { fill, roomsMessages } from "@/i18n/rooms";
import { CalendarIcon, CheckIcon, PlusIcon, ShieldIcon, TodayIcon, TalkIcon, UsersIcon } from "../icons";
import { MicIcon } from "./bits";
import s from "./Rooms.module.css";

function Choice<T extends string>({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string; Icon: ComponentType<{ className?: string }> }[];
}) {
  return (
    <fieldset className={s.choiceField}>
      <legend>{label}</legend>
      <div className={s.choices}>
        {options.map(({ value: option, label, hint, Icon }) => (
          <label key={option} className={s.choice}>
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
            <Icon />
            <span><strong>{label}</strong>{hint && <small>{hint}</small>}</span>
            <CheckIcon className={s.choiceCheck} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CreateRoomForm({ tz, defaultStart, minStart }: { tz: string; defaultStart: string; minStart: string }) {
  const m = useMsg(roomsMessages);
  const [state, action, pending] = useActionState(createRoom, undefined);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<"chat" | "voice">("chat");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [access, setAccess] = useState<"open" | "request">("open");
  const [speakers, setSpeakers] = useState("5");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const error = state?.error ? m.errors[state.error as keyof typeof m.errors] ?? m.errors.failed : null;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      className={s.form}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className={s.formFields}>
        <label className={s.field}>
          <span>{m.fTitle}</span>
          <input className={s.input} name="title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={80} placeholder={m.fTitlePh} autoComplete="off" />
        </label>
        <label className={s.field}>
          <span>{m.fDescription} <small>· {m.optional}</small></span>
          <textarea className={s.input} name="description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} placeholder={m.fDescriptionPh} />
        </label>
        <div className={s.formGroup}>
          <Choice label={m.fFormat} name="format" value={format} onChange={setFormat} options={[
            { value: "chat", label: m.format.chat, hint: m.fFormatHint.chat, Icon: TalkIcon },
            { value: "voice", label: m.format.voice, hint: m.fFormatHint.voice, Icon: MicIcon },
          ]} />
          {format === "voice" && (
            <label className={s.field}>
              <span>{m.fSpeakers}</span>
              <input className={`${s.input} ${s.shortInput}`} type="number" name="max_speakers" min={1} max={20} required value={speakers} onChange={(e) => setSpeakers(e.target.value)} />
              <small>{m.fSpeakersHint}</small>
            </label>
          )}
        </div>
        <div className={s.formGroup}>
          <Choice label={m.fWhen} name="when" value={when} onChange={setWhen} options={[
            { value: "now", label: m.fNow, Icon: TodayIcon },
            { value: "later", label: m.fLater, Icon: CalendarIcon },
          ]} />
          {when === "later" && (
            <>
              <label className={s.field}>
                <span>{m.fStartsAt}</span>
                <input className={s.input} type="datetime-local" name="starts_at" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} min={minStart} step={60} />
                <small>{fill(m.fTz, { tz })}</small>
              </label>
              <Choice label={m.fAccess} name="access" value={access} onChange={setAccess} options={[
                { value: "open", label: m.access.open, hint: m.fAccessHint.open, Icon: UsersIcon },
                { value: "request", label: m.access.request, hint: m.fAccessHint.request, Icon: ShieldIcon },
              ]} />
            </>
          )}
        </div>
      </fieldset>
      {error && <p className={s.error} role="alert">{error}</p>}
      <footer className={s.formActions}>
        <button type="submit" disabled={pending} className={s.primary}>
          {when === "later" ? <CalendarIcon /> : <PlusIcon />}
          {pending ? m.saving : when === "later" ? m.schedule : m.fSubmit}
        </button>
        <Link href="/rooms" className={s.secondary}>{m.cancel}</Link>
      </footer>
    </form>
  );
}
