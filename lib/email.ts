import nodemailer from "nodemailer";
import { env } from "@/lib/env";
import { logEvent } from "@/lib/observability";

export type EmailDeliveryResult = {
  delivery: "smtp" | "log";
  messageId?: string;
};

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  requestId?: string;
}): Promise<EmailDeliveryResult> {
  if (!env.SMTP_URL && !env.SMTP_HOST) {
    logEvent("info", "email.dev_preview", {
      to: input.to,
      subject: input.subject,
      preview: input.text,
      requestId: input.requestId
    });
    return { delivery: "log" };
  }

  const transporter = nodemailer.createTransport(
    env.SMTP_URL
      ? env.SMTP_URL
      : {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE === "true",
          auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
        }
  );

  const info = await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });

  logEvent("info", "email.sent", {
    to: input.to,
    subject: input.subject,
    messageId: info.messageId,
    requestId: input.requestId
  });

  return { delivery: "smtp", messageId: info.messageId };
}

export function accountEmailHtml(title: string, body: string, actionLabel: string, actionUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#172033">
      <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
      <p>${escapeHtml(body)}</p>
      <p><a href="${escapeHtml(actionUrl)}" style="background:#166c7d;color:#fff;padding:10px 14px;text-decoration:none;border-radius:6px;display:inline-block">${escapeHtml(actionLabel)}</a></p>
      <p style="font-size:13px;color:#5f6b7a">This link is time-limited. If you did not request this, contact your clinic administrator.</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}
