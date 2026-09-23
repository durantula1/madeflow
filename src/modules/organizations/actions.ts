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
  currency: z.enum(["EUR", "BGN"]),
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

export async function updateOrganizationAction(formData:FormData){const data=z.object({name:z.string().trim().min(2).max(120),orderNumberPrefix:z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9-]+$/),defaultCurrency:z.enum(["EUR","BGN"]),brandColor:z.union([z.literal(""),z.string().regex(/^#[0-9a-fA-F]{6}$/)])}).parse(Object.fromEntries(formData));const context=await requireTenantContext();requireRole(context,["owner"]);await getDatabase().update(organizations).set({name:data.name,orderNumberPrefix:data.orderNumberPrefix.toUpperCase(),defaultCurrency:data.defaultCurrency,brandColor:data.brandColor||null}).where(eq(organizations.id,context.organizationId));revalidatePath("/app/settings");revalidatePath("/app","layout");}
