import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import { changeOrderLineItems, changeOrderRevisions, changeOrders, organizations, portalDecisions, projectContacts, projects } from "@/db/schema";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { getPortalSession } from "@/modules/change-portal/session";
import { documentCode } from "@/modules/change-orders/labels";
import { ChangePdfDocument } from "@/modules/pdf/change-document";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: RouteContext<"/api/changes/[changeOrderId]/pdf">) {
  const { changeOrderId } = await params;
  const db = getDatabase();
  const [document] = await db.select({
    id: changeOrders.id, projectId: projects.id, publicId: projects.publicId, organizationId: organizations.id,
    organizationName: organizations.name, projectName: projects.name, contactName: projectContacts.name,
    kind: changeOrders.documentKind, sequenceNumber: changeOrders.sequenceNumber, currentRevisionId: changeOrders.currentRevisionId,
  }).from(changeOrders).innerJoin(projects, eq(projects.id, changeOrders.projectId)).innerJoin(organizations, eq(organizations.id, changeOrders.organizationId))
    .leftJoin(projectContacts, and(eq(projectContacts.projectId, projects.id), eq(projectContacts.isPrimary, true)))
    .where(eq(changeOrders.id, changeOrderId)).limit(1);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const context = await getOptionalTenantContext();
  let authorized = false;
  if (context?.organizationId === document.organizationId) {
    try { await requireProjectCapability(context, document.projectId, "view"); authorized = true; } catch { /* portal access may still apply */ }
  }
  if (!authorized) {
    const portal = await getPortalSession(document.publicId);
    authorized = !!portal && portal.projectId === document.projectId && portal.scope.includes("view");
  }
  if (!authorized) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const requested = new URL(request.url).searchParams.get("revision");
  const revisionId = requested && /^\d+$/.test(requested) ? Number(requested) : document.currentRevisionId;
  const [revision] = await db.select().from(changeOrderRevisions)
    .where(and(eq(changeOrderRevisions.id, revisionId!), eq(changeOrderRevisions.changeOrderId, document.id))).limit(1);
  if (!revision?.frozenAt || !revision.contentHash) return NextResponse.json({ error: "Published revision required" }, { status: 409 });
  const [lines, [decision]] = await Promise.all([
    db.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, revision.id)).orderBy(changeOrderLineItems.position),
    db.select({ decision: portalDecisions.decision, typedName: portalDecisions.typedName, createdAt: portalDecisions.createdAt }).from(portalDecisions).where(eq(portalDecisions.revisionId, revision.id)).limit(1),
  ]);
  const code = documentCode(document.kind, document.sequenceNumber);
  const buffer = await renderToBuffer(ChangePdfDocument({ organization: document.organizationName, project: document.projectName, contact: document.contactName ?? "Клиент", kind: document.kind, code, revision, lines, decision: decision ?? null }));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${document.kind}-${document.sequenceNumber}-v${revision.revisionNumber}.pdf"`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
