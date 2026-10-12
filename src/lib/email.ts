import { createHmac, timingSafeEqual } from "node:crypto";
import { courseMessages } from "@/i18n/course";
import { isLocale, type Locale } from "@/i18n/config";
import { weekOf, type Course, type CourseState } from "./course";

// Письмо дня курса «Мой путь». Отправка через Resend (бесплатно до 100 писем в день).
// Пока не заданы RESEND_API_KEY, EMAIL_FROM и DAILY_EMAILS=on, рассылка работает «вхолостую»: только считает письма.

export function emailSendingEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.DAILY_EMAILS === "on");
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

const secret = () => process.env.EMAIL_SECRET || process.env.CRON_SECRET || "";

// Подпись ссылки «Отключить письма»: по ней можно отписаться без входа, но только от своих писем.
export function unsubscribeToken(userId: string) {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url");
}

export function checkUnsubscribeToken(userId: string, token: string) {
  if (!secret() || !userId || !token) return false;
  const a = Buffer.from(unsubscribeToken(userId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Ссылка в тексте письма ведёт на страницу с кнопкой (чтобы почтовые сканеры не отписывали человека сами),
// а заголовок List-Unsubscribe — на адрес для отписки в один клик прямо из почтового приложения.
export function unsubscribeUrl(userId: string, oneClick = false) {
  const q = `u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
  return oneClick ? `${siteUrl()}/api/email/unsubscribe?${q}` : `${siteUrl()}/email/unsubscribe?${q}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export function renderDailyEmail(opts: {
  course: Pick<Course, "plan" | "length" | "locale">;
  state: Pick<CourseState, "current" | "done" | "streak" | "idleDays">;
  name?: string | null;
  userId: string;
}) {
  const locale: Locale = isLocale(opts.course.locale) ? opts.course.locale : "ru";
  const m = courseMessages[locale].email;
  const { plan, length } = opts.course;
  const n = Math.min(opts.state.current, length);
  const day = plan.days[n - 1];
  const week = plan.weeks[weekOf(n, length)];
  const returning = opts.state.idleDays >= 2 && opts.state.done > 0;
  const subject = returning ? m.subjectReturn(n) : m.subject(n, day.title);
  const link = `${siteUrl()}/course/day/${n}`;
  const unsub = unsubscribeUrl(opts.userId);
  const pct = Math.round((opts.state.done / length) * 100);

  // Полоска пути: по клетке на каждый день, пройденные — зелёные, сегодняшний — лавандовый.
  const cells = Array.from({ length }, (_, i) => {
    const color = i < opts.state.done ? "#9db894" : i === n - 1 ? "#b9aed6" : "#ebe4d8";
    return `<td style="width:${(100 / length).toFixed(2)}%;padding:0 1px;"><div style="height:6px;border-radius:3px;background:${color};font-size:0;line-height:0;">&nbsp;</div></td>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4efe7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(returning ? m.returnLead : day.focus)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe7;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <div style="width:52px;height:52px;border-radius:50%;background:#c9d8e6;background-image:radial-gradient(circle at 35% 30%,#fffdf9 0%,#e7e1f2 35%,#bccfe0 70%,#b4cbaa 100%);margin:0 auto 12px auto;"></div>
            <div style="font-family:${SERIF};font-size:20px;color:#34373c;">${locale === "en" ? "Opora" : "Опора"}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#fffdf9;border:1px solid #ebe4d8;border-radius:28px;padding:36px 32px;">
            <p style="margin:0 0 6px 0;font-family:${SANS};font-size:14px;color:#6c6f75;">${esc(m.hello(opts.name ?? ""))}</p>
            <p style="margin:0 0 18px 0;font-family:${SANS};font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#7f71a8;">${esc(m.dayOf(n, length))} · ${esc(week?.title ?? "")}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;"><tr>${cells}</tr></table>
            <h1 style="margin:0 0 14px 0;font-family:${SERIF};font-weight:normal;font-size:28px;line-height:1.25;color:#34373c;">${esc(day.title)}</h1>
            ${returning ? `<p style="margin:0 0 14px 0;font-family:${SANS};font-size:16px;line-height:1.65;color:#34373c;">${esc(m.returnLead)}</p>` : ""}
            <p style="margin:0 0 24px 0;font-family:${SANS};font-size:16px;line-height:1.65;color:#6c6f75;">${esc(day.focus)}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
              <tr>
                <td style="background:#e3ecdf;border-radius:20px;padding:18px 20px;">
                  <p style="margin:0 0 6px 0;font-family:${SANS};font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#6a8a62;">${esc(m.step)}</p>
                  <p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.55;color:#34373c;">${esc(day.task)}</p>
                </td>
              </tr>
            </table>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td align="center" style="border-radius:999px;background:#34373c;">
                  <a href="${link}" style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:15px;font-weight:600;color:#fffdf9;text-decoration:none;border-radius:999px;">${esc(m.open(n))}</a>
                </td>
              </tr>
            </table>
            <p style="margin:14px 0 0 0;font-family:${SANS};font-size:13px;color:#a3a4a8;text-align:center;">${esc(m.minutes(day.minutes))} · ${pct}%</p>
            ${opts.state.streak >= 2 ? `<p style="margin:24px 0 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:#6c6f75;text-align:center;">${esc(m.streak(opts.state.streak))}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:26px 24px 0 24px;font-family:${SANS};font-size:12px;line-height:1.6;color:#a3a4a8;">
            ${esc(m.notMedical)}<br><br>
            ${esc(m.why(plan.title))}<br>
            <a href="${unsub}" style="color:#6c6f75;">${esc(m.unsubscribe)}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    m.hello(opts.name ?? ""),
    `${m.dayOf(n, length)} · ${week?.title ?? ""}`,
    "",
    day.title,
    returning ? m.returnLead : "",
    day.focus,
    "",
    `${m.step}: ${day.task}`,
    "",
    `${m.open(n)}: ${link}`,
    "",
    m.notMedical,
    m.why(plan.title),
    `${m.unsubscribe}: ${unsub}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  return { subject, html, text, unsubscribe: unsubscribeUrl(opts.userId, true) };
}

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; unsubscribe: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: { "List-Unsubscribe": `<${msg.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
