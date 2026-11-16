import { NextResponse } from "next/server";
import { bearerToken, requireUser } from "@/lib/supabase/server";
import * as core from "@/lib/actions";
import * as care from "@/lib/chat-actions";
import * as course from "@/lib/course-actions";
import * as dream from "@/lib/dream-actions";
import * as guide from "@/lib/guide-actions";
import * as intake from "@/lib/intake-actions";
import * as mail from "@/lib/notification-email-actions";
import * as plan from "@/lib/plan-actions";
import * as practice from "@/lib/practice-actions";
import * as pro from "@/lib/pro-actions";
import * as record from "@/lib/record-actions";
import * as session from "@/lib/session-actions";
import * as share from "@/lib/share-actions";
import * as wellbeing from "@/lib/wellbeing-actions";
import * as rooms from "@/lib/rooms/actions";
import * as consult from "@/lib/consult/actions";

export const runtime = "nodejs";
export const maxDuration = 60;

// Мост для мобильного приложения: те же действия, что вызывает сайт (Server Actions), но по токену из заголовка.
// Список закрытый: только действия самого человека в его пространстве, без админки и входа (вход идёт напрямую в Supabase).
type Body = { name?: string; args?: unknown[]; form?: Record<string, unknown> };
type Fn = (...args: never[]) => Promise<unknown>;
type Kind = "args" | "form" | "state";

const ACTIONS: Record<string, [Kind, Fn]> = {
  startConversation: ["form", core.startConversation],
  deleteConversation: ["form", core.deleteConversation],
  undoLastMessage: ["args", core.undoLastMessage],
  deleteAllHistory: ["args", core.deleteAllHistory],
  rateConversation: ["args", core.rateConversation],
  addJournalEntry: ["state", core.addJournalEntry],
  deleteJournalEntry: ["form", core.deleteJournalEntry],
  reflectOnJournal: ["form", core.reflectOnJournal],
  updateProfile: ["state", core.updateProfile],
  saveVoice: ["args", core.saveVoice],
  deleteAccount: ["form", core.deleteAccount],

  sendCareMessage: ["args", care.sendCareMessage],
  markCareRead: ["args", care.markCareRead],

  createCourse: ["args", course.createCourse],
  prepareDay: ["args", course.prepareDay],
  completeDay: ["args", course.completeDay],
  stopCourse: ["form", course.stopCourse],

  saveDream: ["args", dream.saveDream],
  buildStoryboard: ["args", dream.buildStoryboard],
  saveStoryboard: ["args", dream.saveStoryboard],
  reopenStoryboard: ["args", dream.reopenStoryboard],
  skipPanel: ["args", dream.skipPanel],
  rateSimilarity: ["args", dream.rateSimilarity],
  buildReflection: ["args", dream.buildReflection],
  saveReflection: ["args", dream.saveReflection],
  deleteDream: ["args", dream.deleteDream],

  finishGuide: ["form", guide.finishGuide],
  saveIntake: ["args", intake.saveIntake],
  skipIntake: ["args", intake.skipIntake],
  clearIntake: ["args", intake.clearIntake],
  setNotificationEmail: ["args", mail.setNotificationEmail],

  createPlan: ["args", plan.createPlan],
  toggleTip: ["args", plan.toggleTip],
  markGamePlayed: ["args", plan.markGamePlayed],

  askPractice: ["args", practice.askPractice],
  savePracticeRun: ["args", practice.savePracticeRun],
  practiceHistory: ["args", practice.practiceHistory],

  acceptInvite: ["state", pro.acceptInvite],
  setConsent: ["form", pro.setConsent],
  endLink: ["form", pro.endLink],
  countInviteView: ["args", pro.countInviteView],

  setTaskDone: ["state", record.setTaskDone],
  replyTask: ["state", record.replyTask],

  bookSession: ["state", session.bookSession],
  rescheduleSession: ["state", session.rescheduleSession],
  cancelSession: ["form", session.cancelSession],

  sendInviteEmail: ["state", share.sendInviteEmail],

  saveCheckin: ["state", wellbeing.saveCheckin],
  saveBalance: ["state", wellbeing.saveBalance],
  createGoal: ["state", wellbeing.createGoal],
  addGoalStep: ["state", wellbeing.addGoalStep],
  setGoalStatus: ["form", wellbeing.setGoalStatus],
  deleteGoal: ["form", wellbeing.deleteGoal],

  createRoom: ["state", rooms.createRoom],
  sendRoomMessage: ["args", rooms.sendRoomMessage],
  hideRoomMessage: ["args", rooms.hideRoomMessage],
  kickRoomMember: ["args", rooms.kickRoomMember],
  muteRoomMember: ["args", rooms.muteRoomMember],
  setRoomSpeaker: ["args", rooms.setRoomSpeaker],
  setRoomMaxSpeakers: ["args", rooms.setRoomMaxSpeakers],
  raiseHand: ["args", rooms.raiseHand],
  endRoom: ["args", rooms.endRoom],
  requestRoom: ["args", rooms.requestRoom],
  decideRequest: ["args", rooms.decideRequest],
  reportMember: ["args", rooms.reportMember],
  resolveReport: ["args", rooms.resolveReport],
  joinVoice: ["args", rooms.joinVoice],
  loadPanel: ["args", rooms.loadPanel],
  loadMessages: ["args", rooms.loadMessages],

  joinConsult: ["args", consult.joinConsult],
  consultState: ["args", consult.consultState],
  setSpeechConsent: ["args", consult.setSpeechConsent],
};

function toForm(fields: Record<string, unknown> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null || item === false) continue;
      form.append(key, item === true ? "on" : String(item));
    }
  }
  return form;
}

// redirect() и notFound() внутри действия бросают особую ошибку: превращаем её в ответ для телефона.
function navigation(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;
  if (typeof digest !== "string") return null;
  if (digest.startsWith("NEXT_REDIRECT")) return { redirect: digest.split(";")[2] ?? "/" };
  if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404") || digest === "NEXT_NOT_FOUND") return { notFound: true };
  return null;
}

export async function POST(req: Request) {
  if (!(await bearerToken())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > 200_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const entry = body.name ? ACTIONS[body.name] : undefined;
  if (!entry || !Object.hasOwn(ACTIONS, body.name!)) return NextResponse.json({ error: "unknown action" }, { status: 404 });
  const [kind, fn] = entry;
  const call = fn as (...args: unknown[]) => Promise<unknown>;

  try {
    const result =
      kind === "args"
        ? await call(...(Array.isArray(body.args) ? body.args : []))
        : kind === "form"
          ? await call(toForm(body.form))
          : await call(undefined, toForm(body.form));
    return NextResponse.json({ result: result ?? null });
  } catch (error) {
    const nav = navigation(error);
    if (nav) return NextResponse.json(nav);
    console.error(`[mobile] action ${body.name} failed`, error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
