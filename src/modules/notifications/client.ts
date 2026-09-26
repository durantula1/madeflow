import "server-only";

import { after } from "next/server";
import { and, asc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizations, projectContacts, projects, timelineEvents } from "@/db/schema";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { getActivePortalLink } from "@/modules/change-portal/links";

export type ClientMessage = {
  subject: string;
  /** First paragraph; the greeting is added. */
  intro: string;
  /** Facts shown as a small table (label, value). */
  facts?: [string, string][];
  /** Closing line under the button. */
  outro?: string;
  cta?: string;
};

/**
 * Emails the project's primary approver, after the response is sent. Used for what the client should
 * know without opening the portal: a withdrawn or canceled document, an expired one, a recorded payment,
 * a request to accept the work. Nothing is sent without an email address or an active link.
 */
export function emailClient(projectId: string, message: ClientMessage) {
  after(() => sendClientEmail(projectId, message).catch((cause) => console.error("[client-email]", cause)));
}

export async function sendClientEmail(projectId: string, message: ClientMessage) {
  const [contact] = await getDatabase()
    .select({ id: projectContacts.id, name: projectContacts.name, email: projectContacts.email, organizationName: organizations.name })
    .from(projectContacts)
    .innerJoin(projects, eq(projects.id, projectContacts.projectId))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(and(eq(projectContacts.projectId, projectId), eq(projectContacts.isPrimary, true), eq(projectContacts.portalRole, "approver"), isNull(projectContacts.removedAt)))
    .limit(1);
  if (!contact?.email) return false;
  const url = await getActivePortalLink(projectId, contact.id);
  if (!url) return false;
  const facts = message.facts ?? [];
  await sendEmail({
    to: contact.email,
    subject: message.subject,
    text: `Здравей, ${contact.name}!\n\n${message.intro}${facts.length ? `\n\n${facts.map(([label, value]) => `${label}: ${value}`).join("\n")}` : ""}\n\n${message.cta ?? "Отвори портала"}: ${url}${message.outro ? `\n\n${message.outro}` : ""}\n\n— ${contact.organizationName}`,
    html: `<div style="max-width:600px"><p>Здравей, ${escapeHtml(contact.name)}!</p><p>${escapeHtml(message.intro)}</p>${facts.length ? `<table style="border-collapse:collapse">${facts.map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#71717a">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`).join("")}</table>` : ""}<p style="margin-top:20px"><a href="${url}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">${escapeHtml(message.cta ?? "Отвори портала")}</a></p>${message.outro ? `<p style="color:#71717a">${escapeHtml(message.outro)}</p>` : ""}<p style="color:#71717a">— ${escapeHtml(contact.organizationName)}</p></div>`,
  });
  return true;
}

const digestEvents = ["milestone_added", "milestone_moved", "milestone_removed", "milestone_status_changed", "milestones_from_offer_schedule", "work_status_changed"] as const;
const stageStatus: Record<string, string> = { planned: "предстои", in_progress: "започна", completed: "завършен" };
const workStatus: Record<string, string> = { not_started: "предстои", scheduled: "планирана", in_progress: "започна", completed: "завършена" };
const day = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join(".") : "");

/** One line per progress event, in the client's words. */
function digestLine(eventType: string, metadata: Record<string, unknown>) {
  const title = typeof metadata.title === "string" ? `„${metadata.title}“` : "Етап";
  switch (eventType) {
    case "milestone_added": return `Нов етап ${title}, срок ${day(metadata.dueOn)}`;
    case "milestone_moved": return `${title} е преместен от ${day(metadata.previousDueOn)} на ${day(metadata.dueOn)}${typeof metadata.reason === "string" && metadata.reason ? ` (${metadata.reason})` : ""}`;
    case "milestone_removed": return `${title} е премахнат от графика`;
    case "milestone_status_changed": return `${title}: ${stageStatus[String(metadata.status)] ?? String(metadata.status)}`;
    case "milestones_from_offer_schedule": return `Графикът на работата е с дати (${String(metadata.count ?? "")} етапа)`;
    case "work_status_changed": return `Допълнителната работа: ${workStatus[String(metadata.workStatus)] ?? String(metadata.workStatus)}`;
    default: return null;
  }
}

/**
 * Daily: one email per active project whose schedule moved since the last one (stages added, moved,
 * started, finished). Decisions, payments and documents have their own immediate emails.
 */
export async function sendClientDigests(now = new Date()) {
  const db = getDatabase();
  const rows = await db.select({ projectId: timelineEvents.projectId, eventType: timelineEvents.eventType, metadata: timelineEvents.metadata, createdAt: timelineEvents.createdAt })
    .from(timelineEvents)
    .innerJoin(projects, eq(projects.id, timelineEvents.projectId))
    .where(and(
      eq(projects.status, "active"),
      eq(timelineEvents.visibility, "client"),
      eq(timelineEvents.actorType, "staff"),
      inArray(timelineEvents.eventType, [...digestEvents]),
      gt(timelineEvents.createdAt, sql`coalesce(${projects.clientDigestAt}, ${projects.createdAt})`),
      lte(timelineEvents.createdAt, now),
    ))
    .orderBy(asc(timelineEvents.createdAt))
    .limit(2000);
  const byProject = new Map<string, string[]>();
  for (const row of rows) {
    const line = digestLine(row.eventType, (row.metadata ?? {}) as Record<string, unknown>);
    if (line) byProject.set(row.projectId, [...(byProject.get(row.projectId) ?? []), line]);
  }
  let sent = 0;
  for (const [projectId, lines] of byProject) {
    // Claimed first, so a second run of the job does not send the same news again.
    const [claimed] = await db.update(projects).set({ clientDigestAt: now })
      .where(and(eq(projects.id, projectId), sql`${projects.clientDigestAt} is distinct from ${now}`)).returning({ id: projects.id });
    if (!claimed) continue;
    const shown = lines.slice(-12);
    if (await sendClientEmail(projectId, {
      subject: "Новости по графика на обекта",
      intro: "Ето какво се промени в графика на работата от последното ни писмо:",
      facts: shown.map((line, index) => [`${index + 1}.`, line]),
      cta: "Виж графика",
      outro: lines.length > shown.length ? `И още ${lines.length - shown.length} промени — виж ги в портала.` : undefined,
    }).catch(() => false)) sent++;
  }
  return sent;
}
