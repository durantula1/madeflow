import Link from "next/link";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinanceChart } from "@/components/workspace/finance-chart";
import { FilterSelect } from "@/components/workspace/filter-select";
import { ListPagination } from "@/components/workspace/list-filters";
import { getDatabase } from "@/db";
import { projectMembers, projectReceipts, projects } from "@/db/schema";
import { getCurrentMember } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { cents, formatCents } from "@/modules/projects/state";

function monthOffset(month: string, offset: number) {
  const [year, part] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, part - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

const kindOptions = [{ value: "all", label: "Всички видове" }, { value: "deposit", label: "Капаро" }, { value: "progress", label: "Междинно" }, { value: "final", label: "Окончателно" }, { value: "other", label: "Друго" }];
const methodOptions = [{ value: "all", label: "Всички методи" }, { value: "bank", label: "Банков превод" }, { value: "cash", label: "В брой" }, { value: "card", label: "Карта" }, { value: "other", label: "Друго" }];

export default async function FinancePage({ searchParams }: PageProps<"/app/finance">) {
  const context = await requireTenantContext();
  const member = await getCurrentMember(context);
  if (member.role !== "owner" && member.role !== "office") return <div className="rounded-xl border p-6">Нямаш достъп до месечната справка.</div>;
  const params = await searchParams;
  const currentParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const currentMonth = `${currentParts.find((part) => part.type === "year")?.value}-${currentParts.find((part) => part.type === "month")?.value}`;
  const requestedFrom = typeof params.from === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.from) ? params.from : monthOffset(currentMonth, -11);
  const requestedTo = typeof params.to === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.to) ? params.to : currentMonth;
  const from = requestedFrom <= requestedTo ? requestedFrom : monthOffset(currentMonth, -11);
  const to = requestedFrom <= requestedTo ? requestedTo : currentMonth;
  const kind = kindOptions.some((item) => item.value === params.kind) ? String(params.kind) : "all";
  const method = methodOptions.some((item) => item.value === params.method) ? String(params.method) : "all";
  const currency = params.currency === "EUR" || params.currency === "BGN" ? params.currency : "all";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const db = getDatabase();
  const visibleProjects = member.role === "owner"
    ? await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.organizationId, context.organizationId))
    : await db.select({ id: projects.id, name: projects.name }).from(projects).innerJoin(projectMembers, eq(projectMembers.projectId, projects.id)).where(and(eq(projects.organizationId, context.organizationId), eq(projectMembers.userId, context.userId)));
  const ids = visibleProjects.map((item) => item.id);
  const projectId = typeof params.projectId === "string" && ids.includes(params.projectId) ? params.projectId : "all";
  const receipts = ids.length ? await db.select({ id: projectReceipts.id, amount: projectReceipts.amount, currency: projectReceipts.currency, receivedOn: projectReceipts.receivedOn, projectId: projectReceipts.projectId, kind: projectReceipts.kind, method: projectReceipts.method, correctionOfId: projectReceipts.correctionOfId })
    .from(projectReceipts).where(and(
      eq(projectReceipts.organizationId, context.organizationId),
      inArray(projectReceipts.projectId, projectId === "all" ? ids : [projectId]),
      gte(projectReceipts.receivedOn, `${from}-01`),
      lt(projectReceipts.receivedOn, `${monthOffset(to, 1)}-01`),
      kind !== "all" ? eq(projectReceipts.kind, kind as "deposit" | "progress" | "final" | "other") : undefined,
      method !== "all" ? eq(projectReceipts.method, method) : undefined,
      currency !== "all" ? eq(projectReceipts.currency, currency) : undefined,
    )).orderBy(desc(projectReceipts.receivedOn), desc(projectReceipts.id)) : [];
  const totals = new Map<string, bigint>();
  const monthly = new Map<string, { EUR: number; BGN: number }>();
  for (const receipt of receipts) {
    const amount = cents(receipt.amount);
    totals.set(receipt.currency, (totals.get(receipt.currency) ?? 0n) + amount);
    const month = receipt.receivedOn.slice(0, 7);
    const item = monthly.get(month) ?? { EUR: 0, BGN: 0 };
    if (receipt.currency === "EUR" || receipt.currency === "BGN") item[receipt.currency] += Number(amount) / 100;
    monthly.set(month, item);
  }
  const chartData: { month: string; EUR: number; BGN: number }[] = [];
  for (let month = from; month <= to; month = monthOffset(month, 1)) {
    chartData.push({ month, ...(monthly.get(month) ?? { EUR: 0, BGN: 0 }) });
  }
  const currencies = currency === "all" ? ["EUR", "BGN"] : [currency];
  const pageRows = receipts.slice((page - 1) * 20, page * 20);
  const projectNames = new Map(visibleProjects.map((item) => [item.id, item.name]));

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-primary">Финанси</p><h1 className="mt-1 text-3xl font-semibold">Получени плащания</h1><p className="mt-2 text-muted-foreground">Реални постъпления по дата на получаване, с включени корекции.</p></div>
    <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-6">
      <Field><FieldLabel htmlFor="finance-from">От месец</FieldLabel><Input id="finance-from" type="month" name="from" defaultValue={from} className="h-10" /></Field>
      <Field><FieldLabel htmlFor="finance-to">До месец</FieldLabel><Input id="finance-to" type="month" name="to" defaultValue={to} className="h-10" /></Field>
      <Field><FieldLabel>Обект</FieldLabel><FilterSelect name="projectId" value={projectId} options={[{ value: "all", label: "Всички обекти" }, ...visibleProjects.map((item) => ({ value: item.id, label: item.name }))]} /></Field>
      <Field><FieldLabel>Валута</FieldLabel><FilterSelect name="currency" value={currency} options={[{ value: "all", label: "Всички валути" }, { value: "EUR", label: "EUR" }, { value: "BGN", label: "BGN" }]} /></Field>
      <Field><FieldLabel>Вид</FieldLabel><FilterSelect name="kind" value={kind} options={kindOptions} /></Field>
      <Field><FieldLabel>Метод</FieldLabel><FilterSelect name="method" value={method} options={methodOptions} /></Field>
      <Button type="submit" variant="outline" className="h-10 sm:col-span-2 xl:col-span-6">Приложи филтрите</Button>
    </form>
    <div className="grid gap-4 sm:grid-cols-2">{currencies.map((item) => <Card key={item}><CardContent><p className="text-sm text-muted-foreground">Получено в {item}</p><p className="mt-2 text-2xl font-semibold">{formatCents(totals.get(item) ?? 0n, item)}</p></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>По месеци</CardTitle></CardHeader><CardContent>{receipts.length ? <div className="overflow-x-auto"><FinanceChart data={chartData} currencies={currencies} /></div> : <p className="py-10 text-center text-sm text-muted-foreground">Няма получени плащания за избрания период.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Записи ({receipts.length})</CardTitle></CardHeader><CardContent className="divide-y">{pageRows.length ? pageRows.map((receipt) => <div key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p>{receipt.receivedOn} · <Link className="text-primary underline" href={`/app/projects/${receipt.projectId}`}>{projectNames.get(receipt.projectId) ?? "Обект"}</Link></p><p className="mt-1 text-xs text-muted-foreground">{receipt.correctionOfId ? "Корекция" : kindOptions.find((item) => item.value === receipt.kind)?.label} · {methodOptions.find((item) => item.value === receipt.method)?.label ?? receipt.method}</p></div><strong>{formatCents(cents(receipt.amount), receipt.currency)}</strong></div>) : <p className="py-8 text-center text-sm text-muted-foreground">Няма записи за избраните филтри.</p>}</CardContent></Card>
    <ListPagination path="/app/finance" params={{ from, to, projectId, currency, kind, method }} page={page} hasNext={receipts.length > page * 20} />
  </div>;
}
