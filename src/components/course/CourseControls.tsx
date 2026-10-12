"use client";

import { useState } from "react";
import { stopCourse } from "@/lib/course-actions";
import { useMsg } from "@/i18n/client";
import { courseMessages } from "@/i18n/course";
import { buttonStyles } from "../ui";

export function StopCourse({ courseId }: { courseId: string }) {
  const m = useMsg(courseMessages).overview;
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button onClick={() => setAsk(true)} className="text-sm text-ink-faint underline-offset-4 hover:text-ink hover:underline">
        {m.stop}
      </button>
    );
  return (
    <form action={stopCourse} className="animate-fade rounded-[22px] border border-line/70 bg-paper/80 p-5 text-left">
      <input type="hidden" name="id" value={courseId} />
      <p className="text-sm leading-relaxed text-ink-soft">{m.stopConfirm}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={buttonStyles.danger}>{m.stopYes}</button>
        <button type="button" onClick={() => setAsk(false)} className={buttonStyles.ghost}>
          {m.cancel}
        </button>
      </div>
    </form>
  );
}
