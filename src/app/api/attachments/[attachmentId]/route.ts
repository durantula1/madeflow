import { NextResponse } from "next/server";

import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ATTACHMENT_BUCKET, getAttachmentAccess } from "@/modules/change-orders/attachment-data";
import { getPortalSession } from "@/modules/change-portal/session";

export const runtime = "nodejs";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

/**
 * Opens an attachment through a 60-second signed URL. Staff need view access to the project
 * (and to the draft, like the document page); the client portal sees files of sent versions only.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/attachments/[attachmentId]">) {
  const { attachmentId } = await params;
  if (!/^[1-9]\d{0,14}$/.test(attachmentId)) return notFound();
  const attachment = await getAttachmentAccess(Number(attachmentId));
  if (!attachment) return notFound();

  let authorized = false;
  const context = await getOptionalTenantContext();
  if (context?.organizationId === attachment.organizationId) {
    try {
      const member = await requireProjectCapability(context, attachment.projectId, "view");
      authorized = !!attachment.frozenAt || can(member, "drafts.view_all") || attachment.revisionCreatedBy === context.userId;
    } catch { /* portal access may still apply */ }
  }
  if (!authorized && attachment.frozenAt) {
    const portal = await getPortalSession(attachment.projectPublicId);
    authorized = !!portal && portal.projectId === attachment.projectId;
  }
  if (!authorized) return notFound();

  const download = new URL(request.url).searchParams.has("download") ? attachment.originalName : undefined;
  const { data, error } = await createAdminClient().storage.from(ATTACHMENT_BUCKET).createSignedUrl(attachment.storagePath, 60, { download });
  if (error || !data) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
