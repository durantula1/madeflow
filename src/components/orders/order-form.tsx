"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { createOrderAction } from "@/modules/orders/actions";

type Option = { id: string; name: string };
export function OrderForm({ customers, templates }: { customers: Option[]; templates: Option[] }) {
  const [state, action, pending] = useActionState(createOrderAction, {});
  const input = "mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15";
  return <form action={action} className="space-y-5"><label className="block text-sm font-medium">Клиент<select required name="customerId" defaultValue="" className={input}><option value="" disabled>Избери клиент</option>{customers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Шаблон<select required name="templateId" defaultValue={templates[0]?.id ?? ""} className={input}>{templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-sm font-medium">Заглавие на поръчката<input name="title" required placeholder="Напр. Кухня · кв. Лозенец" className={input} /></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Адрес на обекта<input name="siteAddress" className={input} /></label><label className="block text-sm font-medium">Целева дата<input name="targetDeliveryDate" type="date" className={input} /></label></div>{state.error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}<button disabled={pending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />}Създай поръчката</button></form>;
}
