"use client";

import { useActionState, useState } from "react";
import { createRoom } from "@/lib/rooms/actions";
import { useMsg } from "@/i18n/client";
import { fill, roomsMessages } from "@/i18n/rooms";
import { Card, Field, Notice } from "../ui";
import { SubmitButton } from "../SubmitButton";
import { ShieldIcon } from "../icons";

function Choice<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-[18px] border-2 px-4 py-3 transition-all duration-300 ${
            value === o.value ? "border-lilac-deep/60 bg-lilac-soft/50" : "border-transparent bg-milk hover:bg-sand/70"
          }`}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          <span className="block text-[15px] font-medium text-ink">{o.label}</span>
          {o.hint && <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">{o.hint}</span>}
        </label>
      ))}
    </div>
  );
}

export function CreateRoomForm({ tz, defaultStart, minStart }: { tz: string; defaultStart: string; minStart: string }) {
  const m = useMsg(roomsMessages);
  const [state, action] = useActionState(createRoom, undefined);
  const [format, setFormat] = useState<"chat" | "voice">("chat");
  const [when, setWhen] = useState<"now" | "later">("now");
  const [access, setAccess] = useState<"open" | "request">("open");
  const error = state?.error ? m.errors[state.error as keyof typeof m.errors] ?? m.errors.failed : null;

  return (
    <Card className="p-5 sm:p-8">
      <form action={action} className="space-y-6">
        <Field label={m.fTitle} name="title" required minLength={3} maxLength={80} placeholder={m.fTitlePh} autoComplete="off" />
        <label className="block">
          <span className="mb-2 block text-sm text-ink-soft">{m.fDescription}</span>
          <textarea
            name="description"
            maxLength={300}
            rows={3}
            placeholder={m.fDescriptionPh}
            className="w-full resize-none rounded-[18px] border-2 border-transparent bg-milk px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-lilac-deep/60 focus:bg-paper focus:ring-4 focus:ring-lilac-soft"
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm text-ink-soft">{m.fFormat}</legend>
          <Choice
            name="format"
            value={format}
            onChange={setFormat}
            options={[
              { value: "chat", label: m.format.chat, hint: m.fFormatHint.chat },
              { value: "voice", label: m.format.voice, hint: m.fFormatHint.voice },
            ]}
          />
        </fieldset>

        {format === "voice" && (
          <label className="block animate-rise">
            <span className="mb-2 block text-sm text-ink-soft">{m.fSpeakers}</span>
            <input
              type="number"
              name="max_speakers"
              min={1}
              max={20}
              defaultValue={5}
              className="h-13 w-28 rounded-[18px] border-2 border-transparent bg-milk px-4 text-[15px] text-ink outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft"
            />
            <span className="mt-1.5 block text-[13px] text-ink-faint">{m.fSpeakersHint}</span>
          </label>
        )}

        <fieldset>
          <legend className="mb-2 text-sm text-ink-soft">{m.fWhen}</legend>
          <Choice
            name="when"
            value={when}
            onChange={setWhen}
            options={[
              { value: "now", label: m.fNow },
              { value: "later", label: m.fLater },
            ]}
          />
        </fieldset>

        {when === "later" && (
          <div className="animate-rise space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm text-ink-soft">{m.fStartsAt}</span>
              <input
                type="datetime-local"
                name="starts_at"
                required
                defaultValue={defaultStart}
                min={minStart}
                step={60}
                className="h-13 w-full rounded-[18px] border-2 border-transparent bg-milk px-4 text-[15px] text-ink outline-none transition focus:border-lilac-deep/60 focus:ring-4 focus:ring-lilac-soft sm:w-auto"
              />
              <span className="mt-1.5 block text-[13px] text-ink-faint">{fill(m.fTz, { tz })}</span>
            </label>
            <fieldset>
              <legend className="mb-2 text-sm text-ink-soft">{m.fAccess}</legend>
              <Choice
                name="access"
                value={access}
                onChange={setAccess}
                options={[
                  { value: "open", label: m.access.open, hint: m.fAccessHint.open },
                  { value: "request", label: m.access.request, hint: m.fAccessHint.request },
                ]}
              />
            </fieldset>
          </div>
        )}

        <p className="flex items-start gap-2 rounded-2xl bg-mist/70 px-4 py-3 text-[13.5px] leading-relaxed text-sky-deep">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" /> {m.fModerator}
        </p>
        {error && <Notice tone="error">{error}</Notice>}
        <SubmitButton className="w-full sm:w-auto">{m.fSubmit}</SubmitButton>
      </form>
    </Card>
  );
}
