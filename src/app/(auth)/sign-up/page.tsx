import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
export const metadata: Metadata = { title: "Регистрация" };
export default function SignUpPage() { return <div className="w-full"><p className="text-sm font-semibold text-primary">Започни спокойно</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Създай своя workspace</h1><p className="mb-8 mt-2 text-muted-foreground">Без карта и без Stripe. Само работеща бета.</p><AuthForm mode="sign-up" /></div>; }
