import "server-only";

import { Resend } from "resend";

import { getServerEnvironment } from "@/lib/env/server";

type Attachment = { filename: string; content: Buffer };

let client: Resend | undefined;

export async function sendEmail(message: { to: string; subject: string; text: string; html: string; attachments?: Attachment[] }) {
  const environment = getServerEnvironment();
  if (!environment.RESEND_API_KEY) throw new Error("Имейл услугата не е настроена.");
  client ??= new Resend(environment.RESEND_API_KEY);
  const { error } = await client.emails.send({ from: environment.EMAIL_FROM, ...message });
  if (error) throw new Error(`Имейлът не беше изпратен: ${error.message}`);
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}
