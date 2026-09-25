import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { disputePaymentAction } from "@/modules/change-portal/actions";
import { cents, formatCents, getProjectState } from "@/modules/projects/state";
import { EmptyResult } from "@/components/workspace/page/empty-result";

type State = NonNullable<Awaited<ReturnType<typeof getProjectState>>>;

const workLabels: Record<string, string> = {
  not_started: "Одобрена, предстои", scheduled: "Планирана", in_progress: "В работа", completed: "Завършена",
};
const stageLabels: Record<string, string> = { planned: "Предстои", in_progress: "В работа", completed: "Завършен" };
const paymentLabels: Record<string, string> = { deposit: "Капаро", progress: "Междинно", final: "Окончателно", other: "Друго" };
const methodLabels: Record<string, string> = { cash: "В брой", bank: "Банков превод", card: "Карта", other: "Друго" };

export function ProjectOverview({ state, portalPublicId, receiptsHref, showPayments = true, showPending = true, section = "all" }: { state: State; portalPublicId?: string; /** Staff-side link to the full receipts list, shown when only the latest ones are loaded. */ receiptsHref?: string; showPayments?: boolean; showPending?: boolean; section?: "all" | "summary" | "work" | "payments" }) {
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  const priceChanges = state.changes.map((change, index) => ({
    ...change,
    runningMinor: cents(state.offer?.total) + state.changes.slice(0, index + 1).reduce((sum, item) => sum + cents(item.total), 0n),
    previousDeadline: state.changes.slice(0, index).reduce<string | null>((current, item) => item.deadline ?? current, state.offer?.deadline ?? null),
  }));
  return <div className="space-y-5">
    {(section === "all" || section === "summary") ? <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-lg font-semibold">Договорено към момента</h2>
      {state.offer ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Крайна цена на обекта</p><p className="mt-1 text-xl font-semibold">{formatCents(state.contractMinor, state.currency)}</p></div>
        <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Получено</p><p className="mt-1 text-xl font-semibold">{formatCents(state.paidMinor, state.currency)}</p></div>
        <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Оставащо</p><p className="mt-1 text-xl font-semibold">{formatCents(state.remainingMinor, state.currency)}</p></div>
        <div className="rounded-xl bg-secondary p-4"><p className="text-xs text-muted-foreground">Договорен краен срок</p><p className="mt-1 text-xl font-semibold">{state.deadline ?? "—"}</p></div>
      </div> : <p className="mt-3 rounded-xl bg-secondary p-4 text-sm leading-6 text-muted-foreground">{portalPublicId ? "Цената и срокът ще се появят тук, след като одобриш офертата." : "Цената и срокът ще се появят тук, след като клиентът одобри офертата."}</p>}
      {state.offer ? <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-3"><span>Основна оферта · {state.offer.title}</span><strong>{Number(state.offer.total).toFixed(2)} {state.currency}</strong></div>
        {priceChanges.map((change) => <div key={change.id} className="flex justify-between gap-3 border-t pt-2"><span>{change.title} · {workLabels[change.workStatus] ?? change.workStatus}{change.deadline ? ` · срок ${change.previousDeadline ?? "—"} → ${change.deadline}` : " · без промяна в срока"}</span><strong><span className="font-normal text-muted-foreground">Стойност на промяната: </span>{Number(change.total) >= 0 ? "+" : ""}{Number(change.total).toFixed(2)} {state.currency} → {formatCents(change.runningMinor, state.currency)}</strong></div>)}
      </div> : null}
    </section> : null}

    {showPending && (section === "all" || section === "summary") && state.pendingDocuments.length ? <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><h2 className="font-semibold">Чакат решение от клиента</h2><div className="mt-2 space-y-2">{state.pendingDocuments.map((item) => <Link key={item.id} href={portalPublicId ? `/portal/${portalPublicId}/changes/${item.id}` : `/app/offers/${item.id}`} className="flex justify-between gap-3 text-sm text-primary underline"><span>{item.kind === "offer" ? "Оферта" : "Промяна"}: {item.title}</span><span>{item.total} {item.currency}</span></Link>)}</div></section> : null}

    {(section === "all" || section === "work") ? <section className="rounded-2xl border bg-card p-5"><h2 className="text-lg font-semibold">Етапи и срокове</h2>
      {state.milestones.find((item) => item.status !== "completed") ? <p className="mt-2 text-sm font-medium">Следващ етап: {state.milestones.find((item) => item.status !== "completed")?.title}</p> : null}
      {state.milestones.length ? <div className="mt-3 divide-y">{state.milestones.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{item.title}</p><p className="text-muted-foreground">До {item.dueOn}{item.completedAt ? ` · завършен ${item.completedAt.toLocaleDateString("bg-BG")}` : ""}</p></div><span className={`rounded-full px-2 py-1 text-xs ${item.status !== "completed" && item.dueOn < today ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{item.status !== "completed" && item.dueOn < today ? "Просрочен" : item.status !== "completed" && item.dueOn <= nextWeek ? "Наближава" : stageLabels[item.status] ?? item.status}</span></div>)}</div> : <EmptyResult className="mt-3" title="Още няма планирани етапи." />}
    </section> : null}

    {showPayments && (section === "all" || section === "payments") ? <section className="rounded-2xl border bg-card p-5"><h2 className="text-lg font-semibold">Плащания</h2>
      <p className="mt-1 text-sm text-muted-foreground">Планирано: {formatCents(state.plannedMinor, state.currency)} · Получено: {formatCents(state.paidMinor, state.currency)}</p>
      <h3 className="mt-5 font-semibold">Предстоящи вноски</h3>
      {state.installments.length ? <div className="mt-2 divide-y">{state.installments.map((item) => <div key={item.id} className="flex justify-between gap-3 py-2 text-sm"><span>{paymentLabels[item.kind]} · {item.title} · до {item.dueOn}<small className="block text-muted-foreground">Получено {formatCents(item.receivedMinor, item.currency)} · остава {formatCents(item.remainingMinor, item.currency)}</small></span><strong>{Number(item.amount).toFixed(2)} {item.currency}</strong></div>)}</div> : <EmptyResult className="mt-2" title="Няма записан платежен план." />}
      <h3 className="mt-5 font-semibold">Получени суми</h3>
      {state.receipts.length ? <div className="mt-2 divide-y">{state.receipts.map((item) => <div key={item.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto]"><div><p>{item.receivedOn} · {item.correctionOfId ? Number(item.amount) < 0 ? "Сторно" : "Корекция" : paymentLabels[item.kind]} · {methodLabels[item.method] ?? item.method}{item.note && !portalPublicId ? ` · ${item.note}` : ""}</p>{item.dispute?.status === "open" ? <p className="font-medium text-destructive">Оспорено от клиента · {item.dispute.reason}</p> : item.dispute?.status === "resolved" ? <p className="text-muted-foreground">Спорът е разрешен: {item.dispute.resolution}</p> : null}{portalPublicId && Number(item.amount) > 0 && !item.dispute && !item.correctionOfId ? <form action={disputePaymentAction} className="mt-2 flex gap-2"><input type="hidden" name="projectPublicId" value={portalPublicId} /><input type="hidden" name="receiptId" value={item.id} /><Input name="reason" required minLength={5} maxLength={1000} placeholder="Опиши несъответствието" className="h-9 min-w-0 flex-1 bg-background" /><Button type="submit" variant="outline" className="h-9">Оспори</Button></form> : null}</div><strong>{Number(item.amount).toFixed(2)} {item.currency}</strong></div>)}</div> : <EmptyResult className="mt-2" title="Още няма получени плащания." />}
      {state.receiptsTotal > state.receipts.length ? <p className="mt-2 text-xs text-muted-foreground">
        Показани са последните {state.receipts.length} от общо {state.receiptsTotal} плащания. Сумата „Получено“ включва всички.
        {receiptsHref ? <> <Link href={receiptsHref} className="font-medium text-primary underline">Всички плащания</Link></> : null}
      </p> : null}
    </section> : null}
  </div>;
}
