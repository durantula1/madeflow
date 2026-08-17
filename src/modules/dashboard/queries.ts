import "server-only";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { getDatabase } from "@/db";
import { customers, orders, serviceRequests } from "@/db/schema";

export async function getDashboardSummary(organizationId: string) {
  const database = getDatabase();
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [[allOrders], [awaiting], [activeCustomers], [openService], [monthValue]] = await Promise.all([
    database.select({ value: count() }).from(orders).where(and(eq(orders.organizationId, organizationId), isNull(orders.archivedAt))),
    database.select({ value: count() }).from(orders).where(and(eq(orders.organizationId, organizationId), eq(orders.stage, "awaiting_approval"))),
    database.select({ value: count() }).from(customers).where(and(eq(customers.organizationId, organizationId), isNull(customers.archivedAt))),
    database.select({ value: count() }).from(serviceRequests).where(and(eq(serviceRequests.organizationId, organizationId), sql`${serviceRequests.status} in ('open', 'in_progress')`)),
    database.select({ value: sql<bigint>`coalesce(sum(${orders.currentTotalMinor}), 0)` }).from(orders).where(and(eq(orders.organizationId, organizationId), gte(orders.updatedAt, monthStart))),
  ]);
  return { orders: allOrders?.value ?? 0, awaiting: awaiting?.value ?? 0, customers: activeCustomers?.value ?? 0, openService: openService?.value ?? 0, monthValueMinor: monthValue?.value ?? 0n };
}
