"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMsg } from "@/i18n/client";
import { dreamMessages } from "@/i18n/dreams";
import { buttonStyles } from "@/components/ui";
import { CrisisHelp } from "@/components/course/CrisisHelp";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { MAX_PANELS, MOODS, NIGHT, type DreamPanel, type DreamReflection } from "@/lib/dreams";
import {
  buildReflection, buildStoryboard, deleteDream, rateSimilarity, reopenStoryboard, saveReflection, saveStoryboard, skipPanel,
} from "@/lib/dream-actions";
import type { Dream } from "@/lib/dream-data";

type Draw = "idle" | "queued" | "drawing" | "failed";

// Страница одного сна: сценарий → комикс → размышление. Каждый шаг можно поправить и вернуться назад.
export function DreamFlow({
  dream,
  imagesOn,
  left: leftInitial,
  failed,
  children,
}: {
  dream: Dream;
  imagesOn: boolean;
  left: number;
  failed?: boolean;
  children?: React.ReactNode;
}) {
  const m = useMsg(dreamMessages);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(failed ? m.form.failed : "");
  const [crisis, setCrisis] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const rebuild = async () => {
    setBusy(true);
    setError("");
    const res = await buildStoryboard(dream.id);
    setBusy(false);
    if ("crisis" in res) return setCrisis(true);
    if ("error" in res) return setError(m.form.failed);
    router.replace(`/dreams/${dream.id}`);
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    await deleteDream(dream.id);
    router.push("/dreams");
    router.refresh();
  };

  const stage = dream.status === "draft" || dream.panels.length === 0 ? "draft" : dream.status === "storyboard" ? "board" : "comic";

  return (
    <div className="space-y-10">
      {crisis && <CrisisHelp lead={m.form.crisisLead} />}
      {error && <p role="alert" className="rounded-2xl bg-[#ffeeec] px-4 py-3 text-sm text-[#b23b33]">{error}</p>}

      {!crisis && stage === "draft" && (
        <section className="rounded-[30px] bg-paper p-6 shadow-soft sm:p-8">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{dream.text}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => void rebuild()} disabled={busy} className={buttonStyles.primary}>
              {busy ? m.form.working : m.form.submit}
            </button>
            <Link href={`/dreams/${dream.id}/edit`} className={buttonStyles.soft}>{m.board.editDream}</Link>
          </div>
        </section>
      )}

      {!crisis && stage === "board" && <Board dream={dream} busy={busy} onRebuild={() => void rebuild()} />}
      {!crisis && stage === "comic" && <Comic dream={dream} imagesOn={imagesOn} left={leftInitial} onCrisis={() => setCrisis(true)} />}

      {!crisis && stage === "comic" && children}

      <footer className="border-t border-line pt-6">
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)} className="inline-flex items-center gap-2 text-sm text-ink-faint transition hover:text-[#b23b33]">
            <TrashIcon className="h-4 w-4" /> {m.remove}
          </button>
        ) : (
          <div role="alertdialog" aria-label={m.remove} className="rounded-[22px] bg-[#ffeeec] p-5">
            <p className="text-[15px] text-ink">{m.removeConfirm}</p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => void remove()} disabled={busy} className={buttonStyles.danger}>{m.removeYes}</button>
              <button type="button" onClick={() => setConfirm(false)} className={buttonStyles.ghost}>{m.cancel}</button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

/* ---------- Сценарий ---------- */

type Row = { key: string; id?: string; scene: string; caption: string };

function Board({ dream, busy, onRebuild }: { dream: Dream; busy: boolean; onRebuild: () => void }) {
  const m = useMsg(dreamMessages);
  const b = m.board;
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(dream.panels.map((p) => ({ key: p.id, id: p.id, scene: p.scene, caption: p.caption })));
  const [saving, setSaving] = useState(false);
  const fresh = useRef(0);

  const patch = (key: string, part: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...part } : r)));
  const move = (i: number, by: number) =>
    setRows((cur) => {
      const next = [...cur];
      const j = i + by;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const draw = async () => {
    setSaving(true);
    const res = await saveStoryboard(dream.id, rows.map(({ id, scene, caption }) => ({ id, scene, caption })), true);
    if ("ok" in res) router.refresh();
    else setSaving(false);
  };

  const field = "w-full rounded-[16px] border-2 border-transparent bg-milk px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition focus:border-lilac-deep/60 focus:bg-paper";
  const filled = rows.filter((r) => r.scene.trim());

  return (
    <section>
      <h2 className="font-serif text-[22px] text-ink sm:text-[26px]">{b.heading}</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">{b.intro}</p>
      {rows.length === 0 && <p className="mt-5 text-sm text-ink-faint">{b.empty}</p>}
      <ol className="mt-6 space-y-4">
        {rows.map((r, i) => (
          <li key={r.key} className="rounded-[26px] bg-paper p-5 shadow-soft sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium text-paper" style={{ background: NIGHT.violet }}>
                {b.panel(i + 1)}
              </span>
              <span className="flex items-center gap-1 text-ink-faint">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={b.up} title={b.up} className="h-9 w-9 rounded-full transition hover:bg-sand hover:text-ink disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={b.down} title={b.down} className="h-9 w-9 rounded-full transition hover:bg-sand hover:text-ink disabled:opacity-30">↓</button>
                <button
                  type="button"
                  onClick={() => setRows((cur) => cur.filter((x) => x.key !== r.key))}
                  aria-label={b.remove}
                  title={b.remove}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#ffeeec] hover:text-[#b23b33]"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </span>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-xs text-ink-faint">{b.scene}</span>
              <textarea value={r.scene} onChange={(e) => patch(r.key, { scene: e.target.value })} maxLength={300} rows={2} className={`${field} resize-none`} />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs text-ink-faint">{b.caption}</span>
              <input value={r.caption} onChange={(e) => patch(r.key, { caption: e.target.value })} maxLength={160} className={field} />
            </label>
          </li>
        ))}
      </ol>
      {rows.length < MAX_PANELS && (
        <button
          type="button"
          onClick={() => setRows((cur) => [...cur, { key: `new-${fresh.current++}`, scene: "", caption: "" }])}
          className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-dashed border-sand-deep px-4 py-2.5 text-sm text-ink-soft transition hover:border-lilac hover:text-ink"
        >
          <PlusIcon className="h-4 w-4" /> {b.add}
        </button>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void draw()} disabled={saving || busy || filled.length === 0} className={buttonStyles.primary}>
          {saving ? b.saving : b.draw}
        </button>
        <Link href={`/dreams/${dream.id}/edit`} className={buttonStyles.soft}>{b.editDream}</Link>
        <button type="button" onClick={onRebuild} disabled={busy || saving} className={buttonStyles.ghost}>
          {busy ? m.form.working : b.rebuild}
        </button>
      </div>
    </section>
  );
}

/* ---------- Комикс и размышление ---------- */

function Comic({ dream, imagesOn, left: leftInitial, onCrisis }: { dream: Dream; imagesOn: boolean; left: number; onCrisis: () => void }) {
  const m = useMsg(dreamMessages);
  const c = m.comic;
  const router = useRouter();
  const [panels, setPanels] = useState<DreamPanel[]>(dream.panels);
  const [draw, setDraw] = useState<Record<string, Draw>>(() =>
    Object.fromEntries(dream.panels.map((p) => [p.id, p.status === "failed" ? "failed" : imagesOn && !p.skipped && !p.url ? "queued" : "idle"])),
  );
  const [left, setLeft] = useState(leftInitial);
  const [limit, setLimit] = useState(false);
  const [similarity, setSimilarity] = useState<number | null>(dream.similarity);
  const [reflection, setReflection] = useState<DreamReflection | null>(dream.reflection);
  const [thinking, setThinking] = useState(false);
  const [reflectError, setReflectError] = useState(false);
  const working = useRef(false);

  // Кадры рисуются по одному, по порядку: готовые сразу видны, ошибка в одном не мешает остальным.
  useEffect(() => {
    if (working.current || limit) return;
    const next = panels.find((p) => draw[p.id] === "queued");
    if (!next) return;
    working.current = true;
    setDraw((d) => ({ ...d, [next.id]: "drawing" }));
    (async () => {
      let state: Draw = "failed";
      try {
        const res = await fetch(`/api/dreams/${dream.id}/panels/${next.id}`, { method: "POST" });
        const json = (await res.json().catch(() => ({}))) as { url?: string; softened?: boolean; left?: number; error?: string };
        if (res.ok && json.url) {
          state = "idle";
          setPanels((cur) => cur.map((p) => (p.id === next.id ? { ...p, url: json.url!, softened: Boolean(json.softened), status: "ready" } : p)));
          if (typeof json.left === "number") setLeft(json.left);
        } else if (json.error === "limit") {
          state = "idle";
          setLimit(true);
          setLeft(0);
        } else if (json.error === "crisis") {
          state = "idle";
          onCrisis();
        }
      } catch {}
      working.current = false;
      setDraw((d) => ({ ...d, [next.id]: state }));
    })();
  }, [draw, panels, limit, dream.id, onCrisis]);

  const queue = (id: string) => {
    setLimit(false);
    setDraw((d) => ({ ...d, [id]: "queued" }));
  };
  const toggleSkip = async (p: DreamPanel) => {
    const skipped = !p.skipped;
    setPanels((cur) => cur.map((x) => (x.id === p.id ? { ...x, skipped, url: skipped ? null : x.url } : x)));
    setDraw((d) => ({ ...d, [p.id]: !skipped && imagesOn ? "queued" : "idle" }));
    await skipPanel(p.id, skipped);
  };
  const rate = (n: number) => {
    setSimilarity(n);
    void rateSimilarity(dream.id, n);
  };
  const reflect = async () => {
    setThinking(true);
    setReflectError(false);
    const res = await buildReflection(dream.id);
    setThinking(false);
    if ("crisis" in res) return onCrisis();
    if ("error" in res) return setReflectError(true);
    setReflection(res.reflection);
  };
  const backToBoard = async () => {
    await reopenStoryboard(dream.id);
    router.refresh();
  };

  const drawingNow = Object.values(draw).some((s) => s === "drawing" || s === "queued");

  return (
    <>
      <section>
        <h2 className="font-serif text-[22px] text-ink sm:text-[26px]">{c.heading}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-faint">{imagesOn ? c.honest : c.noImages}</p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {panels.map((p, i) => (
            <li key={p.id}>
              <Frame panel={p} n={i + 1} state={draw[p.id]} />
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[13px] text-ink-faint">
                {p.softened && !p.skipped && <span className="text-ink-soft">{c.symbolic}</span>}
                {draw[p.id] === "failed" && (
                  <span role="alert" className="text-[#b23b33]">
                    {c.failed(i + 1)}
                  </span>
                )}
                {imagesOn && !p.skipped && draw[p.id] !== "drawing" && draw[p.id] !== "queued" && (
                  <button type="button" onClick={() => queue(p.id)} disabled={left <= 0} className="underline-offset-4 transition hover:text-ink hover:underline disabled:opacity-40">
                    {draw[p.id] === "failed" || !p.url ? c.retry : c.redraw}
                  </button>
                )}
                {imagesOn && draw[p.id] !== "drawing" && (
                  <button type="button" onClick={() => void toggleSkip(p)} className="underline-offset-4 transition hover:text-ink hover:underline">
                    {p.skipped ? c.unskip : c.skip}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {limit && <p role="status" className="mt-5 rounded-2xl bg-lilac-soft px-4 py-3 text-sm text-ink">{c.limit}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-faint">
          {imagesOn && !limit && <span>{c.left(left)}</span>}
          <button type="button" onClick={() => void backToBoard()} disabled={drawingNow} className="underline-offset-4 transition hover:text-ink hover:underline disabled:opacity-40">
            {c.editBoard}
          </button>
        </div>

        {imagesOn && panels.some((p) => p.url) && (
          <div className="mt-8 rounded-[26px] bg-paper p-5 shadow-soft sm:p-6">
            <p className="text-[15px] text-ink">{c.similarity}</p>
            <div className="mt-3 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={similarity === n}
                  aria-label={`${c.similarity} ${n}`}
                  onClick={() => rate(n)}
                  className={`h-11 w-11 rounded-full text-[15px] font-medium transition ${
                    (similarity ?? 0) >= n ? "text-paper" : "bg-milk text-ink-soft hover:bg-sand"
                  }`}
                  style={(similarity ?? 0) >= n ? { background: NIGHT.violet } : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 flex justify-between text-xs text-ink-faint" style={{ maxWidth: 252 }}>
              <span>{c.similarityLow}</span>
              <span>{c.similarityHigh}</span>
            </p>
            {similarity && <p role="status" className="mt-3 text-sm text-ink-soft">{c.thanks}</p>}
          </div>
        )}
      </section>

      {!reflection ? (
        <section>
          <button type="button" onClick={() => void reflect()} disabled={thinking} className={buttonStyles.primary}>
            {thinking ? c.thinking : c.next}
          </button>
          {reflectError && <p role="alert" className="mt-3 text-sm text-[#b23b33]">{m.reflect.failed}</p>}
        </section>
      ) : (
        <Reflection dream={dream} reflection={reflection} onCrisis={onCrisis} />
      )}
    </>
  );
}

// Один кадр 4:5. Подпись накладывает интерфейс: генераторы пишут кириллицу с ошибками.
function Frame({ panel: p, n, state }: { panel: DreamPanel; n: number; state: Draw }) {
  const c = useMsg(dreamMessages).comic;
  const mood = MOODS[p.mood];
  const showImage = Boolean(p.url) && !p.skipped;
  return (
    <figure
      className="relative aspect-[4/5] overflow-hidden rounded-[22px] shadow-soft"
      style={{ border: `3px solid ${NIGHT.sky}`, background: `linear-gradient(165deg, ${mood.from} 0%, ${mood.to} 100%)` }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.url!} alt={p.scene} className="absolute inset-0 h-full w-full animate-fade object-cover" />
      ) : (
        <>
          <svg viewBox="0 0 200 250" className="absolute inset-0 h-full w-full" aria-hidden>
            <circle cx="150" cy="52" r="24" fill={NIGHT.gold} opacity=".9" />
            <circle cx="140" cy="46" r="22" fill={mood.from} opacity=".55" />
            {[[30, 40], [62, 78], [96, 30], [176, 110], [24, 128], [120, 96]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 2 ? 1.4 : 2} fill={NIGHT.cream} opacity=".8" />
            ))}
            <path d="M0 196c40-26 70-8 100-20s60-30 100-10v84H0z" fill={NIGHT.sky} opacity=".45" />
          </svg>
          <p className="absolute inset-x-5 top-[24%] text-center text-[15px] leading-snug text-paper/90">
            {state === "drawing" ? c.drawing : state === "queued" ? c.queued : p.scene}
          </p>
          {(state === "drawing" || state === "queued") && (
            <span className="absolute left-1/2 top-[44%] h-9 w-9 -translate-x-1/2 animate-breathe rounded-full" style={{ background: NIGHT.gold, opacity: state === "drawing" ? 0.9 : 0.35 }} aria-hidden />
          )}
        </>
      )}
      <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold" style={{ background: NIGHT.cream, color: NIGHT.sky }}>
        {n}
      </span>
      {p.added.length > 0 && showImage && (
        <span
          title={c.addedHint(p.added.join(", "))}
          aria-label={c.addedHint(p.added.join(", "))}
          className="absolute right-3 top-3 flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium"
          style={{ background: NIGHT.gold, color: NIGHT.graphite }}
        >
          ✦<span className="hidden sm:inline">{c.added}</span>
        </span>
      )}
      {p.caption && (
        <figcaption
          className="absolute inset-x-3 bottom-3 rounded-[14px] px-3.5 py-2.5 text-[14px] leading-snug shadow-soft"
          style={{ background: "rgb(251 247 240 / 0.94)", color: NIGHT.graphite }}
        >
          «{p.caption}»
        </figcaption>
      )}
    </figure>
  );
}

function Reflection({ dream, reflection, onCrisis }: { dream: Dream; reflection: DreamReflection; onCrisis: () => void }) {
  const m = useMsg(dreamMessages);
  const r = m.reflect;
  const [answers, setAnswers] = useState<string[]>(reflection.questions.map((_, i) => dream.answers[i] ?? ""));
  const [notes, setNotes] = useState(dream.notes);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const field = "w-full rounded-[16px] border-2 border-transparent bg-milk px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition focus:border-lilac-deep/60 focus:bg-paper";

  const save = async () => {
    setState("saving");
    const res = await saveReflection(dream.id, answers, notes);
    setState("error" in res ? "idle" : "saved");
    if ("crisis" in res) onCrisis();
  };

  return (
    <section>
      <h2 className="font-serif text-[22px] text-ink sm:text-[26px]">{r.heading}</h2>
      <p className="mt-3 rounded-[18px] px-4 py-3 text-[13.5px] leading-relaxed" style={{ background: NIGHT.haze, color: NIGHT.graphite }}>
        {r.disclaimer}
      </p>

      {reflection.noticed && (
        <div className="mt-5 rounded-[26px] p-5 sm:p-6" style={{ background: `linear-gradient(150deg, ${NIGHT.sky}, ${NIGHT.violet})`, color: NIGHT.cream }}>
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: NIGHT.gold }}>{r.noticed}</p>
          <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed">{reflection.noticed}</p>
        </div>
      )}

      <h3 className="mt-7 text-[15px] font-medium text-ink">{r.questions}</h3>
      <ol className="mt-3 space-y-4">
        {reflection.questions.map((q, i) => (
          <li key={i} className="rounded-[22px] bg-paper p-5 shadow-soft">
            <p className="text-[15.5px] leading-relaxed text-ink">{q}</p>
            <textarea
              value={answers[i] ?? ""}
              onChange={(e) => {
                setState("idle");
                setAnswers((cur) => cur.map((a, j) => (j === i ? e.target.value : a)));
              }}
              maxLength={1500}
              rows={2}
              placeholder={r.answer}
              aria-label={q}
              className={`${field} mt-3 resize-y`}
            />
          </li>
        ))}
      </ol>

      <label className="mt-6 block">
        <span className="mb-2 block text-[15px] font-medium text-ink">{r.notes}</span>
        <textarea
          value={notes}
          onChange={(e) => {
            setState("idle");
            setNotes(e.target.value);
          }}
          maxLength={4000}
          rows={4}
          placeholder={r.notesPlaceholder}
          className={`${field} resize-y bg-paper shadow-soft`}
        />
      </label>

      {dream.type === "nightmare" && (
        <p className="mt-5 rounded-[18px] bg-lilac-soft px-4 py-3 text-sm leading-relaxed text-ink">
          {r.nightmare}{" "}
          <Link href="/specialists" className="font-medium text-lilac-deep underline-offset-4 hover:underline">{r.specialists}</Link>
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={state === "saving"} className={buttonStyles.primary}>
          {state === "saved" ? `✓ ${r.saved}` : r.save}
        </button>
      </div>
    </section>
  );
}
