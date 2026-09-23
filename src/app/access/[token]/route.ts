import { randomBytes } from "node:crypto";

import { and, eq, gt, isNull, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { getDatabase } from "@/db";
import {
  organizations,
  portalGrants,
  portalSessions,
  projects,
  timelineEvents,
} from "@/db/schema";
import { hashPortalToken } from "@/lib/crypto/portal-token";
import { PORTAL_COOKIE } from "@/modules/change-portal/session";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/access/[token]">,
) {
  const { token } = await context.params;
  const database = getDatabase();
  const [grant] = await database
    .select({
      id: portalGrants.id,
      projectId: projects.id,
      publicId: projects.publicId,
      organizationId: projects.organizationId,
      portalSessionDays: organizations.portalSessionDays,
    })
    .from(portalGrants)
    .innerJoin(projects, eq(projects.id, portalGrants.projectId))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .where(
      and(
        eq(portalGrants.tokenHash, hashPortalToken(token)),
        isNull(portalGrants.revokedAt),
        or(isNull(portalGrants.expiresAt), gt(portalGrants.expiresAt, new Date())),
      ),
    )
    .limit(1);
  if (!grant)
    return NextResponse.redirect(new URL("/portal/invalid", request.url));

  const sessionSecret = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + grant.portalSessionDays * 24 * 60 * 60 * 1000,
  );
  await database.transaction(async (transaction) => {
    await transaction.insert(portalSessions).values({
      portalGrantId: grant.id,
      sessionHash: hashPortalToken(sessionSecret),
      expiresAt,
      userAgent: request.headers.get("user-agent"),
    });
    await transaction
      .update(portalGrants)
      .set({ lastExchangedAt: new Date() })
      .where(eq(portalGrants.id, grant.id));
    await transaction.insert(timelineEvents).values({
      organizationId: grant.organizationId,
      projectId: grant.projectId,
      actorType: "portal_contact",
      eventType: "portal_session_created",
      visibility: "client",
      metadata: {},
    });
  });
  const response = NextResponse.redirect(
    new URL(`/portal/${grant.publicId}`, request.url),
  );
  response.cookies.set(`${PORTAL_COOKIE}_${grant.publicId}`, sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
