"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { bootstrapOrganization } from "@/modules/organizations/mutations";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireRole, requireTenantContext } from "@/lib/authz/tenant-context";

export type OnboardingState = { error?: string };

const onboardingSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  organizationName: z.string().trim().min(2).max(120),
  currency: z.literal("EUR").default("EUR"),
});

export async function completeOnboardingAction(
  _state: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return { error: "Сесията е изтекла. Влез отново." };
  }

  try {
    await bootstrapOrganization({ userId, ...parsed.data });
  } catch {
    return { error: "Workspace-ът не беше създаден. Опитай отново." };
  }

  redirect("/app");
}

export async function updateOrganizationAction(formData: FormData) {
  const name = z.string().trim().min(2, "Името трябва да е поне 2 символа.").max(120).safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ name: name.data, updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
}

export async function updateDefaultTaxRateAction(formData: FormData) {
  const rate = z.enum(["20", "9", "0"], { error: "Избери ставка." }).safeParse(formData.get("taxRate"));
  if (!rate.success) return { error: rate.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ defaultTaxRate: Number(rate.data).toFixed(2), updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
}

export async function updateOfferValidityAction(formData: FormData) {
  const days = z.coerce.number().int("Въведи цял брой дни.").min(1, "Поне 1 ден.").max(180, "Най-много 180 дни.").safeParse(formData.get("offerValidityDays"));
  if (!days.success) return { error: days.error.issues[0]?.message };
  const context = await requireTenantContext();
  requireRole(context, ["owner"]);
  await getDatabase().update(organizations).set({ offerValidityDays: days.data, updatedAt: new Date() }).where(eq(organizations.id, context.organizationId));
  revalidatePath("/app", "layout");
}
