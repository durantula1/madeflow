"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { signInAction, signUpAction } from "@/modules/auth/actions";

export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, {});
  return <form action={formAction} className="space-y-4">
    {next ? <input type="hidden" name="next" value={next} /> : null}
    {mode === "sign-up" && <label className="block text-sm font-medium">Име<input name="displayName" required autoComplete="name" className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>}
    <label className="block text-sm font-medium">Имейл<input name="email" type="email" required autoComplete="email" className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>
    <label className="block text-sm font-medium">Парола<input name="password" type="password" required minLength={8} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>
    {mode === "sign-up" && <label className="flex items-start gap-2.5 text-sm text-muted-foreground"><input name="acceptLegal" type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-primary" /><span>Приемам <Link href={LEGAL_DOCUMENTS.terms.href} target="_blank" className="font-medium text-foreground underline underline-offset-4">Условията за ползване</Link> и <Link href={LEGAL_DOCUMENTS.privacy.href} target="_blank" className="font-medium text-foreground underline underline-offset-4">Политиката за поверителност</Link>.</span></label>}
    {mode === "sign-in" && <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground">Забравена парола?</Link></div>}
    {state.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</p>}
    {state.message && <p role="status" className="rounded-xl bg-tile-mint px-3 py-2.5 text-sm text-tile-mint-foreground">{state.message}</p>}
    <button disabled={pending} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />}{mode === "sign-in" ? "Влез" : "Създай профил"}</button>
    <p className="text-center text-sm text-muted-foreground">{mode === "sign-in" ? "Нямаш профил?" : "Вече имаш профил?"} <Link className="font-semibold text-foreground underline underline-offset-4" href={`${mode === "sign-in" ? "/sign-up" : "/sign-in"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{mode === "sign-in" ? "Регистрирай се" : "Влез"}</Link></p>
  </form>;
}
