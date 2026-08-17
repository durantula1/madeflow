"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDatabase } from "@/db";
import { activityEvents, customers } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { customerInputSchema } from "@/modules/customers/schemas";

export type CustomerActionState = { error?: string };

export async function createCustomerAction(
  _state: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = customerInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const context = await requireTenantContext();
  const database = getDatabase();
  const customerId = await database.transaction(async (transaction) => {
    const [customer] = await transaction
      .insert(customers)
      .values({
        organizationId: context.organizationId,
        ...parsed.data,
        email: parsed.data.email || null,
      })
      .returning({ id: customers.id });

    if (!customer) throw new Error("Клиентът не беше създаден.");

    await transaction.insert(activityEvents).values({
      organizationId: context.organizationId,
      actorType: "user",
      actorUserId: context.userId,
      eventType: "customer_created",
      entityType: "customer",
      entityId: customer.id,
    });
    return customer.id;
  });

  revalidatePath("/app/customers");
  redirect(`/app/customers/${customerId}`);
}

