"use client";
import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { createCustomerAction } from "@/modules/customers/actions";

export function CustomerForm() {
  const [state, action, pending] = useActionState(createCustomerAction, {});
  const input = "mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15";
  return <form action={action} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Тип<select name="kind" className={input} defaultValue="person"><option value="person">Физическо лице</option><option value="company">Фирма</option></select></label><label className="block text-sm font-medium">Име / лице за контакт<input name="name" required className={input} /></label><label className="block text-sm font-medium">Име на фирмата<input name="companyName" className={input} /></label><label className="block text-sm font-medium">Имейл<input name="email" type="email" className={input} /></label><label className="block text-sm font-medium">Телефон<input name="phone" type="tel" className={input} /></label><label className="block text-sm font-medium">Адрес<input name="address" className={input} /></label></div><label className="block text-sm font-medium">Бележки<textarea name="notes" rows={4} className="mt-1.5 w-full rounded-xl border bg-background p-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>{state.error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p>}<button disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />}Запази клиента</button></form>;
}
