import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
export const metadata: Metadata = { title: "Вход" };
export default function SignInPage() { return <div className="w-full"><p className="text-sm font-semibold text-primary">Добре дошъл отново</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Вход в MadeFlow</h1><p className="mb-8 mt-2 text-muted-foreground">Продължи към работното си пространство.</p><AuthForm mode="sign-in" /></div>; }
