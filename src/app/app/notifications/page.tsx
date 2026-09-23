import Link from "next/link";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { staffNotifications } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { markNotificationReadAction } from "@/modules/team/notification-actions";

export default async function NotificationsPage() {
  const context = await requireTenantContext();
  const notifications = await getDatabase().select().from(staffNotifications)
    .where(and(eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.userId, context.userId)))
    .orderBy(desc(staffNotifications.createdAt)).limit(100);
  return <div><p className="text-sm font-semibold text-primary">Екип</p><h1 className="mt-1 text-3xl font-semibold">Известия</h1><p className="mt-2 text-muted-foreground">Решения от клиенти, промени на права и важни действия по обекти.</p>
    <div className="mt-7 divide-y overflow-hidden rounded-2xl border bg-card">{notifications.length ? notifications.map((item) => <div key={item.id} className={`flex flex-wrap items-start justify-between gap-3 p-4 ${item.readAt ? "" : "bg-primary/5"}`}><div><p className="font-medium">{item.title}</p>{item.body ? <p className="mt-1 text-sm text-muted-foreground">{item.body}</p> : null}<time className="mt-1 block text-xs text-muted-foreground">{item.createdAt.toLocaleString("bg-BG")}</time>{item.href?.startsWith("/app/") ? <Link href={item.href} className="mt-2 inline-block text-sm font-semibold text-primary">Отвори →</Link> : null}</div>{!item.readAt ? <ActionForm action={markNotificationReadAction} success="Отбелязано като прочетено"><input type="hidden" name="notificationId" value={item.id} /><ActionSubmit variant="outline">Отбележи като прочетено</ActionSubmit></ActionForm> : null}</div>) : <p className="p-8 text-center text-sm text-muted-foreground">Няма известия.</p>}</div>
  </div>;
}
