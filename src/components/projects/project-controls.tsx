import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FilterSelect } from "@/components/workspace/filter-select";
import { addMilestoneAction, correctReceiptAction, recordReceiptAction, resolvePaymentDisputeAction } from "@/modules/projects/operations";
import { getProjectState } from "@/modules/projects/state";

type State = NonNullable<Awaited<ReturnType<typeof getProjectState>>>;
const paymentKinds = [{ value: "deposit", label: "Капаро" }, { value: "progress", label: "Междинно" }, { value: "final", label: "Окончателно" }, { value: "other", label: "Друго" }];
const methods = [{ value: "bank", label: "Банков превод" }, { value: "cash", label: "В брой" }, { value: "card", label: "Карта" }, { value: "other", label: "Друго" }];

export function ProjectControls({ state, canManage, canRecordPayments, disputes, section = "all" }: {
  state: State; canManage: boolean; canRecordPayments: boolean;
  disputes: Array<{ id: string; reason: string; receiptId: string }>;
  section?: "all" | "work" | "payments";
}) {
  const projectId = state.project.id;
  const today = new Date().toISOString().slice(0, 10);
  const showWork = section === "all" || section === "work";
  const showPayments = section === "all" || section === "payments";
  return <div className="flex flex-col gap-5">
    {showWork && canManage ? <DialogTrigger>
      <Button type="button">Добави етап</Button>
      <Dialog className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Добави етап</DialogTitle>
          <DialogDescription>Срокът е за работата, не за плащане.</DialogDescription>
        </DialogHeader>
        <ActionForm action={addMilestoneAction} success="Етапът е добавен" className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <Field><FieldLabel htmlFor="milestone-title">Име</FieldLabel><Input id="milestone-title" name="title" required minLength={2} placeholder="Напр. Монтаж" /></Field>
          <Field><FieldLabel htmlFor="milestone-date">Срок</FieldLabel><DatePicker id="milestone-date" name="dueOn" required aria-label="Срок" /></Field>
          <Field className="sm:col-span-2"><FieldLabel>Работа</FieldLabel><FilterSelect name="changeOrderId" value="none" options={[{ value: "none", label: "Основна работа" }, ...state.changes.map((change) => ({ value: change.id, label: change.title }))]} /></Field>
          <ActionSubmit className="sm:col-span-2">Добави етап</ActionSubmit>
        </ActionForm>
      </Dialog>
    </DialogTrigger> : null}
    {showPayments && canRecordPayments ? <DialogTrigger>
      <Button type="button">Запиши плащане</Button>
      <Dialog className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Запиши получено плащане</DialogTitle>
          <DialogDescription>Сумата влиза в полученото и в остатъка по договора.</DialogDescription>
        </DialogHeader>
        <ActionForm action={recordReceiptAction} success="Плащането е записано" className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <Field><FieldLabel>Вид</FieldLabel><FilterSelect name="kind" value="deposit" options={paymentKinds} /></Field>
          <Field><FieldLabel htmlFor="receipt-amount">Получена сума</FieldLabel><Input id="receipt-amount" type="number" name="amount" min="0.01" step="0.01" required /></Field>
          <Field><FieldLabel htmlFor="receipt-date">Дата</FieldLabel><DatePicker id="receipt-date" name="receivedOn" defaultValue={today} required aria-label="Дата на получаване" /></Field>
          <Field><FieldLabel>Метод</FieldLabel><FilterSelect name="method" value="bank" options={methods} /></Field>
          <Field className="sm:col-span-2"><FieldLabel htmlFor="receipt-note">Бележка</FieldLabel><Input id="receipt-note" name="note" maxLength={500} /></Field>
          <ActionSubmit className="sm:col-span-2">Запиши плащането</ActionSubmit>
        </ActionForm>
      </Dialog>
    </DialogTrigger> : null}
    {showPayments && canRecordPayments && state.receipts.some((item) => Number(item.amount) > 0 && !item.correctionOfId) ? <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Коригирай запис</h2>
      {state.receiptsTotal > state.receipts.length ? <p className="text-xs text-muted-foreground">Може да коригираш записите от последните {state.receipts.length} плащания.</p> : null}
      {state.receipts.filter((item) => Number(item.amount) > 0 && !item.correctionOfId).map((item) => <ActionForm key={item.id} action={correctReceiptAction} success="Плащането е коригирано" className="flex flex-wrap items-end gap-3 border-t pt-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="receiptId" value={item.id} />
        <span className="min-w-36 text-sm">{item.receivedOn} · {item.amount}</span>
        <Field className="min-w-32 flex-1"><FieldLabel>Нова сума</FieldLabel><Input type="number" name="amount" step="0.01" min="0.01" required /></Field>
        <Field className="min-w-48 flex-1"><FieldLabel>Причина</FieldLabel><Input name="reason" required minLength={3} /></Field>
        <ActionSubmit variant="outline">Коригирай</ActionSubmit>
      </ActionForm>)}
    </section> : null}
    {showPayments && canRecordPayments && disputes.length ? <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">Оспорени плащания</h2>
      {disputes.map((item) => <ActionForm key={item.id} action={resolvePaymentDisputeAction} success="Спорът е разрешен" className="flex flex-wrap items-end gap-3 border-t pt-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="disputeId" value={item.id} />
        <span className="min-w-40 flex-1 text-sm">{item.reason}</span>
        <Field className="min-w-48 flex-1"><FieldLabel>Решение</FieldLabel><Input name="resolution" required minLength={3} /></Field>
        <ActionSubmit variant="outline">Разреши</ActionSubmit>
      </ActionForm>)}
    </section> : null}
  </div>;
}
