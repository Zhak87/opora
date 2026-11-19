"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { newer, readState, writeState, type StateKey, type Stored } from "@/lib/practice-state";

// Состояние практики, которое живёт в аккаунте (practice_state) и в этом браузере.
// Сначала сразу показываем локальную копию, потом сверяемся с аккаунтом: побеждает более свежая.
// Запись в аккаунт идёт с паузой; если сети или таблицы нет, локальная копия остаётся и уйдёт позже.
const localKey = (key: StateKey) => `opora-state-${key}`;

function readLocal<T>(key: StateKey, clean: (v: unknown) => T | null): Stored<T> | null {
  try {
    const raw = localStorage.getItem(localKey(key));
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored<unknown>;
    const data = clean(v?.data);
    return data === null ? null : { data, at: Number(v.at) || 0 };
  } catch {
    return null;
  }
}

function writeLocal<T>(key: StateKey, value: Stored<T> | null) {
  try {
    if (value === null) localStorage.removeItem(localKey(key));
    else localStorage.setItem(localKey(key), JSON.stringify(value));
  } catch {}
}

export type SyncStatus = "loading" | "saved" | "saving" | "local";

export function useSynced<T>(key: StateKey, clean: (v: unknown) => T | null, legacy?: () => T | null) {
  const [value, setValue] = useState<T | null>(null);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const timer = useRef<number | null>(null);
  const pending = useRef<Stored<T> | null | undefined>(undefined);
  const supabase = useRef<ReturnType<typeof createClient> | null>(null);

  const push = useCallback(async () => {
    const next = pending.current;
    if (next === undefined) return;
    pending.current = undefined;
    try {
      supabase.current ??= createClient();
      const ok = await writeState(supabase.current, key, next === null ? null : next.data);
      setStatus(ok ? "saved" : "local");
    } catch {
      setStatus("local");
    }
  }, [key]);

  useEffect(() => {
    let alive = true;
    let local = readLocal(key, clean);
    if (!local && legacy) {
      const old = legacy();
      if (old !== null) local = { data: old, at: Date.now() };
    }
    if (local) setValue(local.data);
    (async () => {
      try {
        supabase.current ??= createClient();
        const remoteRaw = await readState<unknown>(supabase.current, key);
        const remoteData = remoteRaw ? clean(remoteRaw.data) : null;
        const remote = remoteRaw && remoteData !== null ? { data: remoteData, at: remoteRaw.at } : null;
        const best = newer(local, remote);
        if (!alive) return;
        if (best) {
          setValue(best.data);
          writeLocal(key, best);
        }
        if (best && best === local && (!remote || local.at > remote.at)) {
          pending.current = best;
          await push();
        } else setStatus("saved");
      } catch {
        if (alive) setStatus("local");
      }
    })();
    return () => {
      alive = false;
    };
    // clean/legacy — чистые функции модуля, ключ не меняется
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Сохранить: сразу локально, в аккаунт через паузу (или сразу, если now).
  const save = useCallback(
    (data: T | null, now = false) => {
      setValue(data);
      const stored = data === null ? null : { data, at: Date.now() };
      writeLocal(key, stored);
      pending.current = stored;
      setStatus("saving");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(push, now ? 0 : 900);
    },
    [key, push],
  );

  // Уходя со страницы, дописываем то, что ещё не ушло.
  useEffect(() => {
    const flush = () => {
      if (pending.current !== undefined) push();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [push]);

  return { value, save, status, ready: status !== "loading" || value !== null };
}
