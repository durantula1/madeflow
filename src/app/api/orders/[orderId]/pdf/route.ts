import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getOrderPassport } from "@/modules/orders/queries";
import { OrderPdfDocument } from "@/modules/pdf/order-document";

export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{orderId:string}>}){const[{orderId},context]=await Promise.all([params,requireTenantContext()]);const passport=await getOrderPassport({organizationId:context.organizationId,orderId});if(!passport)return NextResponse.json({error:"Not found"},{status:404});const requested=new URL(request.url).searchParams.get("version");const version=passport.versions.find(item=>item.id===requested)??passport.versions[0];if(!version)return NextResponse.json({error:"Publish a version first"},{status:409});const buffer=await renderToBuffer(React.createElement(OrderPdfDocument,{organizationName:context.organizationName,orderNumber:passport.order.orderNumber,title:passport.order.title,customerName:passport.order.customerName,versionNumber:version.versionNumber,contentHash:version.contentHash,publishedAt:version.publishedAt,snapshot:version.snapshotJson as Parameters<typeof OrderPdfDocument>[0]["snapshot"],commercial:version.commercialSnapshotJson as Parameters<typeof OrderPdfDocument>[0]["commercial"],currency:passport.order.currency}));return new Response(new Uint8Array(buffer),{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${passport.order.orderNumber}-v${version.versionNumber}.pdf"`,"Cache-Control":"private, no-store"}})}
