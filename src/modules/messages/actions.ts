"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, count, desc, eq, gt, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, documentMessages, organizations, projectContacts, projects } from "@/db/schema";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { markThreadRead } from "@/modules/messages/queries";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { getPortalSession, isOrganizationStaff } from "@/modules/change-portal/session";
import { notifyProjectStaff } from "@/modules/notifications/staff";

export type MessageState = { error?: string; ok?: number };

const body = z.string().trim().min(1, "Напиши съобщение.").max(2000, "Съобщението е твърде дълго.");
const HOURLY_LIMIT = 20;

async function documentInProject(changeOrderId: string, projectId: string) {
  const [document] = await getDatabase().select({ id: changeOrders.id, organizationId: changeOrders.organizationId, projectId: changeOrders.projectId, revisionId: changeOrders.currentRevisionId, title: changeOrderRevisions.title })
    .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.projectId, projectId))).limit(1);
  return document ?? null;
}

async function tooManyRecent(changeOrderId: string, authorId: string) {
  const [row] = await getDatabase().select({ total: count() }).from(documentMessages)
    .where(and(eq(documentMessages.changeOrderId, changeOrderId), eq(documentMessages.authorId, authorId), gt(documentMessages.createdAt, new Date(Date.now() - 3_600_000))));
  return (row?.total ?? 0) >= HOURLY_LIMIT;
}

/** A client question from the portal. Only documents the client can see (sent at least once) accept questions. */
export async function sendClientMessageAction(_: MessageState, formData: FormData): Promise<MessageState> {
  const parsed = z.object({ projectPublicId: z.uuid(), changeOrderId: z.uuid(), body }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const session = await getPortalSession(parsed.data.projectPublicId);
  if (!session) return { error: "Сесията е изтекла. Отвори отново линка от имейла." };
  if (await isOrganizationStaff(session.organizationId)) return { error: "Излез от служебния профил, за да пишеш като клиент." };
  const document = await documentInProject(parsed.data.changeOrderId, session.projectId);
  const [shown] = document ? await getDatabase().select({ id: changeOrderRevisions.id }).from(changeOrderRevisions)
    .where(and(eq(changeOrderRevisions.changeOrderId, document.id), isNotNull(changeOrderRevisions.frozenAt))).limit(1) : [];
  if (!document || !shown) return { error: "Документът не е намерен." };
  if (await tooManyRecent(document.id, session.contactId)) return { error: "Изпрати твърде много съобщения. Опитай отново след малко." };
  await getDatabase().transaction(async (tx) => {
    await tx.insert(documentMessages).values({ organizationId: session.organizationId, projectId: session.projectId, changeOrderId: document.id, revisionId: document.revisionId, authorType: "portal_contact", authorId: session.contactId, body: parsed.data.body });
    await notifyProjectStaff(tx, { organizationId: session.organizationId, projectId: session.projectId, eventType: "client_message", title: `${session.contactName} пита за „${document.title}“`, body: parsed.data.body, href: `/app/offers/${document.id}?tab=messages` });
  });
  revalidatePath(`/portal/${parsed.data.projectPublicId}/changes/${document.id}`);
  revalidatePath(`/app/offers/${document.id}`);
  return { ok: Date.now() };
}

/** A staff answer; the client gets an email with a link back to the document. */
export async function sendStaffMessageAction(_: MessageState, formData: FormData): Promise<MessageState> {
  const parsed = z.object({ changeOrderId: z.uuid(), body }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const context = await requireTenantContext();
  const [target] = await getDatabase().select({ projectId: changeOrders.projectId }).from(changeOrders)
    .where(and(eq(changeOrders.id, parsed.data.changeOrderId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
  if (!target) return { error: "Документът не е намерен." };
  try { await requireProjectCapability(context, target.projectId, "view"); }
  catch (cause) { return { error: cause instanceof Error ? cause.message : "Нямаш достъп." }; }
  const document = await documentInProject(parsed.data.changeOrderId, target.projectId);
  if (!document) return { error: "Документът не е намерен." };
  if (await tooManyRecent(document.id, context.userId)) return { error: "Твърде много съобщения за кратко време." };
  await getDatabase().insert(documentMessages).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId: document.id, revisionId: document.revisionId, authorType: "staff", authorId: context.userId, body: parsed.data.body, readByStaffAt: new Date() });
  // Answering is what clears the unread count on the Разговор tab.
  await markThreadRead(document.id, "staff");
  after(() => emailClientAnswer(document, parsed.data.body).catch((cause) => console.error("[client-answer-email]", cause)));
  revalidatePath(`/app/offers/${document.id}`);
  return { ok: Date.now() };
}

/** Writes to whoever asked last, falling back to the primary approver. */
async function emailClientAnswer(document: { id: string | null; organizationId: string; projectId: string; title: string }, text: string) {
  const db = getDatabase();
  const [lastAsker] = await db.select({ contactId: documentMessages.authorId }).from(documentMessages)
    .where(and(document.id ? eq(documentMessages.changeOrderId, document.id) : and(eq(documentMessages.projectId, document.projectId), isNull(documentMessages.changeOrderId)), eq(documentMessages.authorType, "portal_contact")))
    .orderBy(desc(documentMessages.id)).limit(1);
  const [contact] = await db.select({ id: projectContacts.id, name: projectContacts.name, email: projectContacts.email }).from(projectContacts)
    .where(lastAsker ? and(eq(projectContacts.id, lastAsker.contactId), isNull(projectContacts.removedAt)) : and(eq(projectContacts.projectId, document.projectId), eq(projectContacts.portalRole, "approver"), eq(projectContacts.isPrimary, true), isNull(projectContacts.removedAt)))
    .limit(1);
  if (!contact?.email) return;
  const link = await getActivePortalLink(document.projectId, contact.id);
  if (!link) return;
  const [organization] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, document.organizationId)).limit(1);
  const from = organization?.name ?? "Фирмата";
  await sendEmail({
    to: contact.email,
    subject: `${from} ти отговори за „${document.title}“`,
    text: `Здравей, ${contact.name}!\n\n${from} ти отговори:\n\n${text}\n\nВиж разговора и документа: ${link}`,
    html: `<div style="max-width:600px"><p>Здравей, ${escapeHtml(contact.name)}!</p><p>${escapeHtml(from)} ти отговори за „${escapeHtml(document.title)}“:</p><blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #f07c62;background:#f7f5f0;white-space:pre-line">${escapeHtml(text)}</blockquote><p style="margin-top:20px"><a href="${link}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">Виж разговора</a></p></div>`,
  });
}

async function tooManyProjectRecent(projectId: string, authorId: string) {
  const [row] = await getDatabase().select({ total: count() }).from(documentMessages)
    .where(and(eq(documentMessages.projectId, projectId), isNull(documentMessages.changeOrderId), eq(documentMessages.authorId, authorId), gt(documentMessages.createdAt, new Date(Date.now() - 3_600_000))));
  return (row?.total ?? 0) >= HOURLY_LIMIT;
}

/** A question about the project as a whole ("кога идвате?"), not about one document. */
export async function sendProjectQuestionAction(_: MessageState, formData: FormData): Promise<MessageState> {
  const parsed = z.object({ projectPublicId: z.uuid(), body }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const session = await getPortalSession(parsed.data.projectPublicId);
  if (!session) return { error: "Сесията е изтекла. Отвори отново линка от имейла." };
  if (session.projectStatus === "archived") return { error: "Обектът е в архива на фирмата. Свържи се с нея директно." };
  if (await isOrganizationStaff(session.organizationId)) return { error: "Излез от служебния профил, за да пишеш като клиент." };
  if (await tooManyProjectRecent(session.projectId, session.contactId)) return { error: "Изпрати твърде много съобщения. Опитай отново след малко." };
  await getDatabase().transaction(async (tx) => {
    await tx.insert(documentMessages).values({ organizationId: session.organizationId, projectId: session.projectId, authorType: "portal_contact", authorId: session.contactId, body: parsed.data.body });
    await notifyProjectStaff(tx, { organizationId: session.organizationId, projectId: session.projectId, eventType: "client_message", title: `${session.contactName} пита за обекта`, body: parsed.data.body, href: `/app/projects/${session.projectId}?tab=questions` });
  });
  revalidatePath(`/portal/${parsed.data.projectPublicId}`);
  revalidatePath(`/app/projects/${session.projectId}`);
  return { ok: Date.now() };
}

/** The team's answer to a project question; the client gets it by email. */
export async function sendProjectAnswerAction(_: MessageState, formData: FormData): Promise<MessageState> {
  const parsed = z.object({ projectId: z.uuid(), body }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const context = await requireTenantContext();
  try { await requireProjectCapability(context, parsed.data.projectId, "view"); }
  catch (cause) { return { error: cause instanceof Error ? cause.message : "Нямаш достъп." }; }
  const [project] = await getDatabase().select({ id: projects.id, name: projects.name, publicId: projects.publicId }).from(projects)
    .where(and(eq(projects.id, parsed.data.projectId), eq(projects.organizationId, context.organizationId))).limit(1);
  if (!project) return { error: "Обектът не е намерен." };
  if (await tooManyProjectRecent(project.id, context.userId)) return { error: "Твърде много съобщения за кратко време." };
  await getDatabase().insert(documentMessages).values({ organizationId: context.organizationId, projectId: project.id, authorType: "staff", authorId: context.userId, body: parsed.data.body, readByStaffAt: new Date() });
  await markThreadRead({ projectId: project.id }, "staff");
  after(() => emailClientAnswer({ id: null, organizationId: context.organizationId, projectId: project.id, title: project.name }, parsed.data.body).catch((cause) => console.error("[client-answer-email]", cause)));
  revalidatePath(`/app/projects/${project.id}`);
  revalidatePath(`/portal/${project.publicId}`);
  return { ok: Date.now() };
}
