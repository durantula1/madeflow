import Link from "next/link";
import { OrderForm } from "@/components/orders/order-form";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listCustomers } from "@/modules/customers/queries";
import { listAvailableTemplates } from "@/modules/orders/queries";

export default async function NewOrderPage() { const context = await requireTenantContext(); const [customers, templates] = await Promise.all([listCustomers({ organizationId: context.organizationId }), listAvailableTemplates(context.organizationId)]); return <div className="mx-auto max-w-3xl"><Link href="/app/orders" className="text-sm text-muted-foreground">← Поръчки</Link><h1 className="mt-5 text-3xl font-semibold tracking-tight">Нова поръчка</h1><p className="mt-2 text-muted-foreground">MadeFlow ще създаде номер и работна спецификация.</p><section className="mt-7 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">{customers.length ? <OrderForm customers={customers.map(c => ({id:c.id,name:c.name}))} templates={templates} /> : <div className="py-8 text-center"><p className="font-medium">Необходим е поне един клиент</p><Link href="/app/customers/new" className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Добави клиент</Link></div>}</section></div>; }
