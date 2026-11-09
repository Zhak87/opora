import type { Locale } from "@/i18n/config";
import { shareMessages } from "@/i18n/share";
import { esc, SANS, SERIF } from "./email";

// Письма-приглашения: клиенту от психолога и психологу-коллеге. Та же спокойная палитра, что у остальных писем.
// Для отправки нужны только RESEND_API_KEY и EMAIL_FROM: это письма, которые человек отправляет сам, по кнопке.

export function inviteEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

const button = (href: string, label: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td align="center" style="border-radius:999px;background:#1d1e2c;">
      <a href="${esc(href)}" style="display:inline-block;padding:15px 34px;font-family:${SANS};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(label)}</a>
    </td>
  </tr>
</table>`;

function layout(opts: { locale: Locale; title: string; preheader: string; body: string; why: string; link: string; fallback: string }) {
  const m = shareMessages[opts.locale];
  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4efe7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe7;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:24px;">
            <div style="width:52px;height:52px;border-radius:50%;background:#aab4ff;background-image:radial-gradient(circle at 35% 30%,#ffffff 0%,#e6e4ff 35%,#c7b2f5 70%,#ffc9b5 100%);margin:0 auto 12px auto;"></div>
            <div style="font-family:${SERIF};font-size:20px;color:#1d1e2c;">${opts.locale === "en" ? "Opora" : "Опора"}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border:1px solid #e6e8f0;border-radius:28px;padding:36px 32px;">
            ${opts.body}
            <p style="margin:26px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:#9fa2b5;text-align:center;">${esc(opts.fallback)}<br><a href="${esc(opts.link)}" style="color:#6c6f75;word-break:break-all;">${esc(opts.link)}</a></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:26px 24px 0 24px;font-family:${SANS};font-size:12px;line-height:1.6;color:#9fa2b5;">
            ${esc(opts.why)}<br><br>${esc(m.footer)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const noteBlock = (note: string) =>
  note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
  <tr><td style="background:#efeaf6;border-radius:20px;padding:16px 20px;font-family:${SERIF};font-style:italic;font-size:16px;line-height:1.6;color:#1d1e2c;">«${esc(note).replace(/\n/g, "<br>")}»</td></tr>
</table>`
    : "";

// Фото специалиста в письме: только по https, иначе инициалы в мягком круге.
function avatar(name: string, photo?: string | null) {
  if (photo && /^https:\/\//.test(photo)) {
    return `<img src="${esc(photo)}" width="72" height="72" alt="" style="display:block;width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 18px auto;border:0;">`;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "·";
  return `<div style="width:72px;height:72px;line-height:72px;border-radius:50%;background:#e6e4ff;margin:0 auto 18px auto;text-align:center;font-family:${SERIF};font-size:26px;color:#1d1e2c;">${esc(initials)}</div>`;
}

export function renderClientInvite(opts: { locale: Locale; name: string; headline?: string | null; photo?: string | null; note?: string; link: string }) {
  const m = shareMessages[opts.locale].clientEmail;
  const subject = m.subject(opts.name);
  const steps = m.steps
    .map(
      (s, i) => `<tr>
  <td width="34" valign="top" style="padding:0 0 10px 0;"><div style="width:24px;height:24px;line-height:24px;border-radius:50%;background:#d6f2e6;text-align:center;font-family:${SANS};font-size:12px;font-weight:600;color:#6a8a62;">${i + 1}</div></td>
  <td valign="top" style="padding:2px 0 10px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:#1d1e2c;">${esc(s)}</td>
</tr>`,
    )
    .join("");
  const body = `${avatar(opts.name, opts.photo)}
            <h1 style="margin:0 0 6px 0;font-family:${SERIF};font-weight:normal;font-size:26px;line-height:1.3;color:#1d1e2c;text-align:center;">${esc(m.title(opts.name))}</h1>
            ${opts.headline ? `<p style="margin:0 0 22px 0;font-family:${SANS};font-size:14px;line-height:1.5;color:#6c63ff;text-align:center;">${esc(opts.headline)}</p>` : `<div style="height:16px;"></div>`}
            ${noteBlock(opts.note ?? "")}
            <p style="margin:0 0 22px 0;font-family:${SANS};font-size:16px;line-height:1.65;color:#6c6f75;">${esc(m.text)}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">${steps}</table>
            ${button(opts.link, m.button)}`;
  const html = layout({ locale: opts.locale, title: subject, preheader: m.preheader, body, why: m.why(opts.name), link: opts.link, fallback: m.fallback });
  const text = [
    m.title(opts.name),
    opts.headline ?? "",
    opts.note ? `«${opts.note}»` : "",
    "",
    m.text,
    "",
    ...m.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    `${m.button}: ${opts.link}`,
    "",
    m.why(opts.name),
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
  return { subject, html, text };
}

export function renderColleagueInvite(opts: { locale: Locale; name: string; photo?: string | null; note?: string; link: string }) {
  const m = shareMessages[opts.locale].colleagueEmail;
  const subject = m.subject(opts.name);
  const points = m.points
    .map(
      (p) => `<tr>
  <td width="26" valign="top" style="padding:7px 0 0 0;"><div style="width:8px;height:8px;border-radius:50%;background:#aaa4ff;font-size:0;line-height:0;">&nbsp;</div></td>
  <td valign="top" style="padding:0 0 10px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:#1d1e2c;">${esc(p)}</td>
</tr>`,
    )
    .join("");
  const body = `${avatar(opts.name, opts.photo)}
            <p style="margin:0 0 10px 0;font-family:${SANS};font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#6c63ff;text-align:center;">${esc(m.title)}</p>
            <h1 style="margin:0 0 22px 0;font-family:${SERIF};font-weight:normal;font-size:24px;line-height:1.35;color:#1d1e2c;text-align:center;">${esc(m.lead(opts.name))}</h1>
            ${noteBlock(opts.note ?? "")}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px 0;"><tr><td style="background:#f6f2ea;border-radius:20px;padding:18px 20px 8px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${points}</table></td></tr></table>
            ${button(opts.link, m.button)}`;
  const html = layout({ locale: opts.locale, title: subject, preheader: m.preheader, body, why: m.why, link: opts.link, fallback: m.fallback });
  const text = [m.title, "", m.lead(opts.name), opts.note ? `«${opts.note}»` : "", "", ...m.points.map((p) => `• ${p}`), "", `${m.button}: ${opts.link}`, "", m.why]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
  return { subject, html, text };
}
