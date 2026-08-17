import Link from "next/link";
import { ArrowRight, CircleAlert, Contact, FileText, Wrench } from "lucide-react";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { formatDate, orderStageClasses, orderStageLabels } from "@/lib/presentation/orders";
import { getDashboardSummary } from "@/modules/dashboard/queries";
import { listOrders } from "@/modules/orders/queries";

export default async function DashboardPage() {
  const context = await requireTenantContext();
  const [summary, recent] = await Promise.all([getDashboardSummary(context.organizationId), listOrders({ organizationId: context.organizationId, limit: 6 })]);
  const cards = [
    { label: "Активни поръчки", value: summary.orders, icon: FileText, hint: "Всички незархивирани" },
    { label: "Чакат одобрение", value: summary.awaiting, icon: CircleAlert, hint: "Изискват внимание" },
    { label: "Клиенти", value: summary.customers, icon: Contact, hint: "В активната база" },
    { label: "Отворен сервиз", value: summary.openService, icon: Wrench, hint: "Отворени и в работа" },
  ];
  return <><div className="flex items-end justify-between"><div><p className="text-sm font-semibold text-primary">Обзор</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Здравей, {context.organizationName}</h1><p className="mt-2 text-muted-foreground">Ето какво се движи в работния поток.</p></div><Link href="/app/orders/new" className="hidden items-center gap-2 text-sm font-semibold text-primary sm:flex">Нова поръчка <ArrowRight className="size-4" /></Link></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,icon:Icon,hint}) => <article key={label} className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p></div><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span></div><p className="mt-4 text-xs text-muted-foreground">{hint}</p></article>)}</div>
    <section className="mt-8 overflow-hidden rounded-2xl border bg-card shadow-sm"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Последни поръчки</h2><p className="text-sm text-muted-foreground">Най-скоро променените паспорти</p></div><Link href="/app/orders" className="text-sm font-semibold text-primary">Виж всички</Link></div>{recent.length ? <div className="divide-y">{recent.map(order => <Link key={order.id} href={`/app/orders/${order.id}`} className="grid gap-2 px-5 py-4 hover:bg-muted/50 sm:grid-cols-[130px_1fr_180px_120px] sm:items-center"><span className="font-mono text-xs text-muted-foreground">{order.orderNumber}</span><div><p className="font-medium">{order.title}</p><p className="text-sm text-muted-foreground">{order.customerName}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${orderStageClasses[order.stage]}`}>{orderStageLabels[order.stage]}</span><span className="text-sm text-muted-foreground sm:text-right">{formatDate(order.updatedAt)}</span></Link>)}</div> : <div className="px-5 py-16 text-center"><p className="font-medium">Още няма поръчки</p><p className="mt-1 text-sm text-muted-foreground">Създай клиент и първата поръчка.</p></div>}</section>
  </>;
}
