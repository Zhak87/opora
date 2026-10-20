"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { savePsychologist, uploadDocument, uploadPhoto } from "@/lib/pro-actions";
import { Button, Field, Notice, buttonStyles } from "../ui";
import { Avatar } from "./bits";
import { useMsg } from "@/i18n/client";
import { proMessages, proLabels, SPECIALIZATIONS, SESSION_LANGUAGES, FORMATS, CURRENCIES } from "@/i18n/pro";
import type { Psychologist } from "@/lib/pro";

const area =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition focus:border-sky focus:ring-4 focus:ring-mist";

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-2 block">
      <span className="block text-sm text-ink-soft">{children}</span>
      {hint && <span className="mt-0.5 block text-xs text-ink-faint">{hint}</span>}
    </span>
  );
}

// Набор переключателей-«таблеток» на чекбоксах: работает и без JavaScript.
function Pills<T extends string>({ name, values, labels, selected }: { name: string; values: readonly T[]; labels: Record<T, string>; selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <label key={v} className="cursor-pointer">
          <input type="checkbox" name={name} value={v} defaultChecked={selected.includes(v)} className="peer sr-only" />
          <span className="inline-flex rounded-full border border-line bg-paper px-4 py-2 text-sm text-ink-soft transition peer-checked:border-lilac peer-checked:bg-lilac-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-sky">
            {labels[v]}
          </span>
        </label>
      ))}
    </div>
  );
}

const MAX_UPLOAD = 4 * 1024 * 1024;

// Фото с телефона весит 5–10 МБ, а для анкеты хватает 800 пикселей: уменьшаем прямо в браузере.
async function shrinkPhoto(file: File, max = 800): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.86));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function PhotoForm({ name, photo }: { name: string; photo: string | null }) {
  const [state, action, pending] = useActionState(uploadPhoto, undefined);
  const [, start] = useTransition();
  const m = useMsg(proMessages).profile;
  const input = useRef<HTMLInputElement>(null);
  async function pick(file: File) {
    const data = new FormData();
    data.set("photo", await shrinkPhoto(file));
    start(() => action(data));
  }
  return (
    <div className="flex items-center gap-5">
      <Avatar name={name} src={photo} size={88} />
      <div className="min-w-0">
        <p className="text-[15px] text-ink">{m.photo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{m.photoHint}</p>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) pick(file);
          }}
        />
        <button type="button" disabled={pending} onClick={() => input.current?.click()} className={`${buttonStyles.soft} mt-3 h-10 px-5 text-sm disabled:opacity-60`}>
          {m.upload}
        </button>
        {state?.error && <p className="mt-2 text-sm text-[#a0614f]">{state.error}</p>}
      </div>
    </div>
  );
}

export function DocumentUpload() {
  const [state, action, pending] = useActionState(uploadDocument, undefined);
  const [tooBig, setTooBig] = useState(false);
  const [, start] = useTransition();
  const m = useMsg(proMessages).profile;
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (!file) return;
          // Больший файл сервер не примет вовсе, и вместо понятной ошибки упадёт страница.
          setTooBig(file.size > MAX_UPLOAD);
          if (file.size > MAX_UPLOAD) return;
          const data = new FormData();
          data.set("document", file);
          start(() => action(data));
        }}
      />
      <button type="button" disabled={pending} onClick={() => input.current?.click()} className={`${buttonStyles.soft} h-10 px-5 text-sm disabled:opacity-60`}>
        {m.upload}
      </button>
      {(tooBig || state?.error) && <p className="mt-2 text-sm text-[#a0614f]">{tooBig ? m.errors.tooBig : state?.error}</p>}
    </div>
  );
}

export function ProfileForm({ p }: { p: Psychologist }) {
  const [state, action, pending] = useActionState(savePsychologist, undefined);
  const [, start] = useTransition();
  const m = useMsg(proMessages).profile;
  const labels = useMsg(proLabels);
  const canSubmit = p.status === "draft" || p.status === "rejected";
  const education = p.education.map((e) => [e.institution, e.degree, e.year].filter(Boolean).join(", ")).join("\n");

  return (
    // Отправляем вручную: так React не очищает длинную анкету после ошибки (например, без галочки условий).
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        start(() => action(data));
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.fullName} name="full_name" defaultValue={p.full_name} maxLength={120} required />
        <label className="block">
          <Label hint={m.slugHint}>{m.slug}</Label>
          <span className="flex h-12 items-center rounded-2xl border border-line bg-paper pl-4 text-[15px] text-ink-faint focus-within:border-sky focus-within:ring-4 focus-within:ring-mist">
            /p/
            <input name="slug" defaultValue={p.slug} pattern="[a-z0-9][a-z0-9\-]{2,39}" required className="h-full min-w-0 flex-1 rounded-r-2xl bg-transparent pr-4 text-ink outline-none" />
          </span>
        </label>
      </div>
      <Field label={m.headline} name="headline" defaultValue={p.headline} maxLength={160} placeholder={m.headlinePlaceholder} />

      <div>
        <Label>{m.specializations}</Label>
        <Pills name="specializations" values={SPECIALIZATIONS} labels={labels.specializations} selected={p.specializations} />
      </div>

      <label className="block">
        <Label>{m.about}</Label>
        <textarea name="about" defaultValue={p.about} rows={4} maxLength={4000} className={area} />
      </label>
      <label className="block">
        <Label>{m.approach}</Label>
        <textarea name="approach" defaultValue={p.approach} rows={4} maxLength={4000} placeholder={m.approachPlaceholder} className={area} />
      </label>
      <label className="block">
        <Label hint={m.educationHint}>{m.education}</Label>
        <textarea name="education" defaultValue={education} rows={3} maxLength={3000} placeholder={m.educationPlaceholder} className={area} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={m.experience} name="experience_years" type="number" min={0} max={70} defaultValue={p.experience_years ?? ""} />
        <Field label={m.price} name="price" type="number" min={0} step={500} defaultValue={p.price ?? ""} />
        <label className="block">
          <span className="mb-2 block text-sm text-ink-soft">{m.currency}</span>
          <select name="currency" defaultValue={p.currency} className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[15px] text-ink outline-none focus:border-sky focus:ring-4 focus:ring-mist">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.duration} name="session_minutes" type="number" min={20} max={180} step={5} defaultValue={p.session_minutes} />
        <Field label={m.city} name="city" defaultValue={p.city ?? ""} maxLength={80} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label>{m.languages}</Label>
          <Pills name="languages" values={SESSION_LANGUAGES} labels={labels.languages} selected={p.languages} />
        </div>
        <div>
          <Label>{m.formats}</Label>
          <Pills name="formats" values={FORMATS} labels={labels.formats} selected={p.formats} />
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
        <input type="checkbox" name="accepting_clients" defaultChecked={p.accepting_clients} className="h-[18px] w-[18px] accent-ink" />
        {m.accepting}
      </label>

      {p.status === "approved" && <p className="rounded-2xl bg-mist/60 px-4 py-3 text-sm leading-relaxed text-sky-deep">{m.requalify}</p>}

      {canSubmit && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand/60 p-4 text-[13px] leading-relaxed text-ink-soft">
          <input type="checkbox" name="terms" className="mt-[3px] h-[18px] w-[18px] shrink-0 accent-ink" />
          {m.terms}
        </label>
      )}

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice>{state.ok}</Notice>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" variant={canSubmit ? "soft" : "primary"} disabled={pending}>
          {pending ? m.saving : m.save}
        </Button>
        {canSubmit && (
          <Button type="submit" name="intent" value="submit" disabled={pending}>
            {m.submit}
          </Button>
        )}
      </div>
    </form>
  );
}
