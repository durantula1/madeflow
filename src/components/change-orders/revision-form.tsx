"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/workspace/filter-select";
import { VatRateField } from "@/components/change-orders/vat-rate-field";
import { createDocumentRevisionAction, type QuickChangeState } from "@/modules/change-orders/actions";

type Line = { key: string; description: string; quantity: string; unit: string; unitPrice: string };
type Initial = {
  id: string; documentKind: "offer" | "change"; title: string; description: string;
  reason: string | null; changeKind: "addition" | "credit" | "no_cost" | "schedule_only";
  subtotal: string; taxRate: string; scheduleImpactType: "none" | "days" | "unknown";
  scheduleImpactDays: number | null; agreedDeadline: string | null;
  clientNote: string | null; internalNote: string | null;
  lineItems: Array<{ description: string; quantity: string; unit: string | null; unitPrice: string }>;
};

/** `withdrawsRevision` is set when the client already has this version; saving takes it back. */
export function RevisionForm({ initial, withdrawsRevision }: { initial: Initial; withdrawsRevision?: number }) {
  const [state, action, pending] = useActionState<QuickChangeState, FormData>(createDocumentRevisionAction, {});
  const [lines, setLines] = useState<Line[]>(initial.lineItems.map((item) => ({ key: crypto.randomUUID(), description: item.description, quantity: item.quantity, unit: item.unit ?? "", unitPrice: item.unitPrice })));
  const [scheduleType, setScheduleType] = useState(initial.scheduleImpactType === "days" ? "days" : "none");
  useEffect(() => { if (state.error) toast.error(state.error); }, [state.error]);
  const payload = lines.filter((line) => line.description.trim()).map((line) => ({ description: line.description.trim(), quantity: Number(line.quantity), unit: line.unit, unitPrice: Number(line.unitPrice) }));
  function updateLine(key: string, property: keyof Omit<Line, "key">, value: string) { setLines((current) => current.map((line) => line.key === key ? { ...line, [property]: value } : line)); }

  return <form action={action} className="space-y-5 rounded-2xl border bg-card p-5">
    <div><h2 className="text-lg font-semibold">{initial.documentKind === "offer" ? "Нова версия на офертата" : "Нова версия на промяната"}</h2><p className="mt-1 text-sm text-muted-foreground">Предишните изпратени версии и решения остават в историята.</p></div>
    {withdrawsRevision ? <div role="note" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><p className="font-semibold">Клиентът вече получи версия {withdrawsRevision}</p><p className="mt-1 text-muted-foreground">Щом запазиш, версия {withdrawsRevision} се оттегля и клиентът вижда „Офертата се обновява“, докато не изпратиш новата. Клиентът получава имейл с разликите, когато я изпратиш.</p></div> : null}
    <input type="hidden" name="changeOrderId" value={initial.id} />
    <input type="hidden" name="lines" value={JSON.stringify(payload)} />
    <Field><FieldLabel htmlFor="revision-title">Заглавие</FieldLabel><Input id="revision-title" name="title" defaultValue={initial.title} required minLength={3} className="h-10" /></Field>
    <Field><FieldLabel htmlFor="revision-description">Описание</FieldLabel><Textarea id="revision-description" name="description" defaultValue={initial.description} required minLength={5} className="min-h-24" /></Field>
    {initial.documentKind === "offer" ? <section className="space-y-3"><h3 className="font-semibold">Позиции</h3>{lines.map((line, index) => <div key={line.key} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_7rem_auto]"><Input aria-label={`Описание ${index + 1}`} value={line.description} onChange={(event) => updateLine(line.key, "description", event.target.value)} className="h-10" /><Input aria-label={`Количество ${index + 1}`} type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(line.key, "quantity", event.target.value)} className="h-10" /><Input aria-label={`Мярка ${index + 1}`} value={line.unit} onChange={(event) => updateLine(line.key, "unit", event.target.value)} className="h-10" /><Input aria-label={`Единична цена ${index + 1}`} type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.key, "unitPrice", event.target.value)} className="h-10" /><Button type="button" variant="outline" onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))}>Премахни</Button></div>)}<Button type="button" variant="outline" onPress={() => setLines((current) => [...current, { key: crypto.randomUUID(), description: "", quantity: "1", unit: "бр.", unitPrice: "0" }])}>Добави позиция</Button></section> : <div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel>Вид промяна</FieldLabel><FilterSelect name="changeKind" value={initial.changeKind} options={[{ value: "addition", label: "Добавка" }, { value: "credit", label: "Намаление" }, { value: "no_cost", label: "Без цена" }, { value: "schedule_only", label: "Само срок" }]} /></Field><Field><FieldLabel htmlFor="revision-subtotal">Цена без ДДС</FieldLabel><Input id="revision-subtotal" type="number" name="subtotal" min="0" step="0.01" defaultValue={Math.abs(Number(initial.subtotal))} className="h-10" /></Field></div>}
    {initial.documentKind === "offer" ? <><input type="hidden" name="changeKind" value="addition" /><input type="hidden" name="subtotal" value="0" /><input type="hidden" name="scheduleImpactType" value="none" /><Field><FieldLabel htmlFor="revision-deadline">Договорен краен срок</FieldLabel><DatePicker id="revision-deadline" name="agreedDeadline" required defaultValue={initial.agreedDeadline ?? ""} aria-label="Договорен краен срок" /></Field></> : <div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel>Отражение върху срока</FieldLabel><input type="hidden" name="scheduleImpactType" value={scheduleType} /><Select aria-label="Отражение върху срока" selectedKey={scheduleType} onSelectionChange={(key) => setScheduleType(String(key))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem id="none">Без промяна</SelectItem><SelectItem id="days">Нов краен срок</SelectItem></SelectGroup></SelectContent></Select></Field>{scheduleType === "days" ? <Field><FieldLabel htmlFor="revision-new-deadline">Нов договорен краен срок</FieldLabel><DatePicker id="revision-new-deadline" name="agreedDeadline" defaultValue={initial.agreedDeadline ?? ""} required aria-label="Нов договорен краен срок" /></Field> : <input type="hidden" name="agreedDeadline" value="" />}</div>}
    <VatRateField defaultValue={initial.taxRate} />
    <Field><FieldLabel htmlFor="revision-reason">Причина</FieldLabel><Input id="revision-reason" name="reason" defaultValue={initial.reason ?? ""} className="h-10" /></Field>
    <div className="grid gap-3 sm:grid-cols-2"><Field><FieldLabel htmlFor="revision-client-note">Бележка към клиента</FieldLabel><Textarea id="revision-client-note" name="clientNote" defaultValue={initial.clientNote ?? ""} className="min-h-20" /></Field><Field><FieldLabel htmlFor="revision-internal-note">Вътрешна бележка</FieldLabel><Textarea id="revision-internal-note" name="internalNote" defaultValue={initial.internalNote ?? ""} className="min-h-20" /></Field></div>
    {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
    <div className="sticky bottom-20 z-20 -mx-5 border-t bg-card/95 px-5 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
      <Button type="submit" isDisabled={pending} className="h-11 w-full sm:w-auto">{pending ? "Запазване…" : withdrawsRevision ? `Оттегли версия ${withdrawsRevision} и създай нова` : "Създай нова версия"}</Button>
    </div>
  </form>;
}
