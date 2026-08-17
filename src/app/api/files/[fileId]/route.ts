import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/db";
import { orderFiles } from "@/db/schema";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request:Request,{params}:{params:Promise<{fileId:string}>}){const [{fileId},context]=await Promise.all([params,requireTenantContext()]);const [file]=await getDatabase().select().from(orderFiles).where(and(eq(orderFiles.organizationId,context.organizationId),eq(orderFiles.id,fileId))).limit(1);if(!file)return NextResponse.json({error:"Not found"},{status:404});const supabase=await createClient();const {data,error}=await supabase.storage.from(file.storageBucket).createSignedUrl(file.storagePath,60,{download:file.originalName});if(error)return NextResponse.json({error:"Could not sign file"},{status:500});return NextResponse.redirect(data.signedUrl);}
