"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowIcon, BackIcon, GridIcon, SparkIcon } from "@/components/icons";
import { useMsg } from "@/i18n/client";
import { dreamMessages } from "@/i18n/dreams";
import { MOODS, type DreamPanel } from "@/lib/dreams";
import styles from "./DreamJournal.module.css";

export type Draw = "idle" | "queued" | "drawing" | "failed";

type ReaderProps = {
  panels: DreamPanel[];
  draw: Record<string, Draw>;
  imagesOn: boolean;
  canDraw: boolean;
  complete: boolean;
  updating: ReadonlySet<string>;
  onComplete: (complete: boolean) => void;
  onRedraw: (id: string) => void;
  onSkip: (panel: DreamPanel) => Promise<boolean>;
};

export function ComicReader({
  panels, draw, imagesOn, canDraw, complete, updating, onComplete, onRedraw, onSkip,
}: ReaderProps) {
  const m = useMsg(dreamMessages);
  const c = m.comic;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const heading = useRef<HTMLHeadingElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const changedView = useRef(false);
  const touchStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const panel = panels[index];
  const last = index === panels.length - 1;
  const upcoming = panels[index + 1];
  const upcomingUrl = upcoming?.skipped ? null : upcoming?.url;

  useEffect(() => {
    if (complete || !upcomingUrl) return;
    const image = new Image();
    image.src = upcomingUrl;
  }, [complete, upcomingUrl]);

  useEffect(() => {
    if (!changedView.current) return;
    changedView.current = false;
    heading.current?.focus();
  }, [complete]);

  const move = (step: -1 | 1) => {
    if (step === -1 && index === 0) return;
    if (step === 1 && last) {
      changedView.current = true;
      onComplete(true);
      return;
    }
    setDirection(step === 1 ? "forward" : "back");
    if (step === -1 && index === 1 && document.activeElement === previousButton.current) {
      nextButton.current?.focus({ preventScroll: true });
    }
    setIndex(index + step);
  };

  const replay = () => {
    setIndex(0);
    setDirection("forward");
    changedView.current = true;
    onComplete(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof Element && event.target.closest("details")) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  };

  const startSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch" || !event.isPrimary || !(event.target instanceof Element)) return;
    if (event.target.closest("button, summary, details")) return;
    touchStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const endSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.pointerId !== start.id) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) move(dx < 0 ? 1 : -1);
  };

  const frame = (p: DreamPanel, i: number) => (
    <ComicFrame
      panel={p}
      state={draw[p.id]}
      index={i}
      imagesOn={imagesOn}
      canDraw={canDraw}
      saving={updating.has(p.id)}
      onRedraw={onRedraw}
      onSkip={onSkip}
    />
  );

  if (complete) {
    return (
      <section className={`${styles.surface} ${styles.finale}`} aria-labelledby="dream-comic-heading">
        <div className={styles.finaleHead}>
          <h2 ref={heading} tabIndex={-1} id="dream-comic-heading">{c.complete}</h2>
          <button type="button" onClick={replay} className={styles.secondary}>
            <BackIcon className="size-4 shrink-0" /> {c.replay}
          </button>
        </div>
        <ol className={styles.spread}>
          {panels.map((p, i) => <li key={p.id}>{frame(p, i)}</li>)}
        </ol>
      </section>
    );
  }

  return (
    <section className={styles.reader} aria-labelledby="dream-comic-heading" onKeyDown={onKeyDown}>
      <div className={styles.readerHead}>
        <h2 ref={heading} tabIndex={-1} id="dream-comic-heading">{c.heading}</h2>
        <div className={styles.progress}>
          {panels.map((p, i) => <i key={p.id} data-active={i === index || undefined} data-past={i < index || undefined} aria-hidden />)}
          <span role="status">{c.progress(index + 1, panels.length)}</span>
        </div>
      </div>
      <div
        key={panel.id}
        className={styles.slide}
        data-direction={direction}
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
        onPointerCancel={() => { touchStart.current = null; }}
      >
        {frame(panel, index)}
      </div>
      <div className={styles.readerNav}>
        {index > 0 && (
          <button ref={previousButton} type="button" onClick={() => move(-1)} className={styles.previous}>
            <BackIcon className="size-4 shrink-0" /> {c.previous}
          </button>
        )}
        <button ref={nextButton} type="button" onClick={() => move(1)} className={styles.next}>
          {last ? c.reveal : c.nextPanel}
          {last ? <GridIcon className="size-4 shrink-0" /> : <ArrowIcon className="size-4 shrink-0" />}
        </button>
      </div>
    </section>
  );
}

function ComicFrame({
  panel, state, index, imagesOn, canDraw, saving, onRedraw, onSkip,
}: Pick<ReaderProps, "imagesOn" | "canDraw" | "onRedraw" | "onSkip"> & {
  panel: DreamPanel;
  state: Draw;
  index: number;
  saving: boolean;
}) {
  const c = useMsg(dreamMessages).comic;
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const [skipError, setSkipError] = useState(false);
  const url = panel.skipped || panel.url === brokenUrl ? null : panel.url;
  const working = state === "drawing" || (canDraw && state === "queued");
  const text = panel.caption ? `«${panel.caption}»` : panel.scene;

  const toggleImage = async () => {
    setSkipError(false);
    try {
      setSkipError(!(await onSkip(panel)));
    } catch {
      setSkipError(true);
    }
  };

  return (
    <>
      <div className={styles.art}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, signed URLs stay in the browser
          <img key={url} src={url} alt={panel.scene} onError={() => setBrokenUrl(url)} />
        ) : (
          <div className={styles.placeholder} data-drawing={working || undefined} style={{ "--panel-mood": MOODS[panel.mood].from } as CSSProperties}>
            <SparkIcon className="size-12 text-[#f5dfa9]" />
            {working && <span role="status">{state === "drawing" ? c.drawing : c.queued}</span>}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className={styles.quote}>{text}</p>
        {((url && (panel.added.length > 0 || panel.softened)) || (imagesOn && !working) || state === "failed") && (
          <div className={styles.frameNotes}>
            {url && panel.added.length > 0 && (
              <details>
                <summary>{c.added}</summary>
                <p>{c.addedHint(panel.added.join(", "))}</p>
              </details>
            )}
            {url && panel.softened && <p>{c.symbolic}</p>}
            {state === "failed" && <p role="status">{c.failed(index + 1)}</p>}
            {imagesOn && !working && (
              <details>
                <summary>{c.frameTools}</summary>
                <div className="flex flex-wrap items-center gap-x-4">
                  {!panel.skipped && (
                    <button type="button" onClick={() => onRedraw(panel.id)} disabled={!canDraw || saving} className={styles.frameAction}>
                      {url && state !== "failed" ? c.redraw : c.retry}
                    </button>
                  )}
                  <button type="button" onClick={() => void toggleImage()} disabled={saving || (panel.skipped && !canDraw)} className={styles.frameAction}>
                    {panel.skipped ? c.unskip : c.skip}
                  </button>
                </div>
                {skipError && <p role="alert">{c.updateFailed}</p>}
              </details>
            )}
          </div>
        )}
      </div>
    </>
  );
}
