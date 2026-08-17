import "server-only";

import { and, asc, eq, ilike, isNull, or } from "drizzle-orm";

import { getDatabase } from "@/db";
import { customers } from "@/db/schema";
import { orders } from "@/db/schema";

export async function listCustomers(input: {
  organizationId: string;
  query?: string;
}) {
  const search = input.query?.trim();
  return getDatabase()
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, input.organizationId),
        isNull(customers.archivedAt),
        search
          ? or(
              ilike(customers.name, `%${search}%`),
              ilike(customers.phone, `%${search}%`),
              ilike(customers.email, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(asc(customers.name))
    .limit(100);
}

export async function getCustomer(input: {
  organizationId: string;
  customerId: string;
}) {
  const [customer] = await getDatabase()
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, input.organizationId),
        eq(customers.id, input.customerId),
      ),
    )
    .limit(1);
  return customer ?? null;
}

export async function listCustomerOrders(input: { organizationId: string; customerId: string }) {
  return getDatabase().select({ id: orders.id, orderNumber: orders.orderNumber, title: orders.title, stage: orders.stage, updatedAt: orders.updatedAt }).from(orders).where(and(eq(orders.organizationId, input.organizationId), eq(orders.customerId, input.customerId), isNull(orders.archivedAt))).orderBy(asc(orders.orderNumber));
}
