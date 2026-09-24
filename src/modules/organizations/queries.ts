import "server-only";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
export async function getOrganizationSettings(organizationId:string){const[organization]=await getDatabase().select({name:organizations.name}).from(organizations).where(eq(organizations.id,organizationId)).limit(1);return organization??null;}
