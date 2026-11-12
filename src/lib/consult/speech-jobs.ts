// Задания распознавания речи, которые сейчас выполняются в этом процессе сервера.
// При отзыве согласия они прерываются, а их результат база всё равно не примет (номер speech_ver уже другой).

const jobs = new Map<string, Set<AbortController>>();

export function startJob(session: string) {
  const c = new AbortController();
  const set = jobs.get(session) ?? new Set();
  set.add(c);
  jobs.set(session, set);
  return {
    signal: c.signal,
    done() {
      set.delete(c);
      if (!set.size) jobs.delete(session);
    },
  };
}

export function cancelJobs(session: string) {
  const set = jobs.get(session);
  if (!set) return 0;
  const n = set.size;
  for (const c of set) c.abort();
  jobs.delete(session);
  return n;
}

export function pendingJobs(session: string) {
  return jobs.get(session)?.size ?? 0;
}
