import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import { getDatabase } from "@/db";
import { staffNotifications } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { markNotificationReadAction } from "@/modules/team/notification-actions";

const label = "Известия";

const columns: DataTableColumn[] = [
  { id: "title", header: "Известие", skeleton: "stack" },
  { id: "when", header: "Кога" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "action", header: "", skeleton: "none" },
];

export async function NotificationsTable({ context, page }: { context: TenantContext; page: number }) {
  const db = getDatabase();
  const mine = and(eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.userId, context.userId));
  const [notifications, [totalRow]] = await Promise.all([
    db.select().from(staffNotifications).where(mine)
      .orderBy(desc(staffNotifications.createdAt), desc(staffNotifications.id)).limit(PAGE_SIZE).offset(pageOffset(page)),
    db.select({ total: count() }).from(staffNotifications).where(mine),
  ]);
  const total = totalRow?.total ?? 0;
  if (!notifications.length && page > lastPage(total)) redirect(pageHref("/app/notifications", {}, "page", lastPage(total)));
  if (!notifications.length) return <EmptyState title="Няма известия" />;
  return <DataTable
    label={label}
    columns={columns}
    rows={notifications.map((item) => ({
      id: item.id,
      cells: [
        <div key="title">
          <p className="font-medium">{item.title}</p>
          {item.body ? <p className="text-sm text-muted-foreground">{item.body}</p> : null}
          {item.href?.startsWith("/app/") ? <Link href={item.href} className="text-sm font-semibold text-primary">Отвори</Link> : null}
        </div>,
        item.createdAt.toLocaleString("bg-BG"),
        <Badge key="status" variant={item.readAt ? "outline" : "sent"}>{item.readAt ? "Прочетено" : "Ново"}</Badge>,
        item.readAt ? null : <ActionForm key="read" action={markNotificationReadAction} success="Отбелязано като прочетено"><input type="hidden" name="notificationId" value={item.id} /><ActionSubmit variant="outline">Отбележи като прочетено</ActionSubmit></ActionForm>,
      ],
    }))}
    footer={<ListPagination path="/app/notifications" params={{}} page={page} total={total} />}
  />;
}

export function NotificationsTableSkeleton() {
  return <DataTableSkeleton label={label} columns={columns} footer={<ListPaginationSkeleton />} />;
}
