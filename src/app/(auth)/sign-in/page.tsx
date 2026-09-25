import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { ACCOUNT_DELETION_GRACE_DAYS } from "@/lib/legal";
export const metadata: Metadata = { title: "Вход" };
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, account } = await searchParams;
  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-primary">Добре дошъл отново</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Вход в Pakto
      </h1>
      <p className="mb-8 mt-2 text-muted-foreground">
        Продължи към работното си пространство.
      </p>
      {account === "deletion-scheduled" ? <p role="status" className="mb-6 rounded-xl bg-muted px-3 py-2.5 text-sm">Профилът ще бъде изтрит след {ACCOUNT_DELETION_GRACE_DAYS} дни. Ако се откажеш, влез отново преди това и отмени изтриването.</p> : null}
      <AuthForm mode="sign-in" next={typeof next === "string" && /^\/join\/[A-Za-z0-9._-]+$/.test(next) ? next : undefined} />
    </div>
  );
}
