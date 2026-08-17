import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Contact,
  FileText,
  LifeBuoy,
  Settings,
  Wrench,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { NavLink } from "@/components/workspace/nav-link";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { signOutAction } from "@/modules/auth/actions";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getOptionalTenantContext();
  if (!context) redirect("/onboarding");
  return (
    <div className="min-h-screen bg-[#f7f4ec] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden min-h-screen flex-col bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <Wordmark inverse className="px-2 py-2" />
        <div className="mt-7 px-3">
          <p className="truncate text-sm font-semibold">
            {context.organizationName}
          </p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/50">
            {context.role === "owner"
              ? "Собственик"
              : context.role === "admin"
                ? "Администратор"
                : "Член"}
          </p>
        </div>
        <nav className="mt-6 space-y-1">
          <NavLink
            href="/app"
            label="Обзор"
            icon={<BarChart3 className="size-4" />}
          />
          <NavLink
            href="/app/orders"
            label="Поръчки"
            icon={<FileText className="size-4" />}
          />
          <NavLink
            href="/app/customers"
            label="Клиенти"
            icon={<Contact className="size-4" />}
          />
          <NavLink
            href="/app/service"
            label="Сервиз"
            icon={<Wrench className="size-4" />}
          />
        </nav>
        <div className="mt-auto space-y-1">
          <NavLink
            href="/app/settings"
            label="Настройки"
            icon={<Settings className="size-4" />}
          />
          <a
            href="mailto:support@madeflow.app"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent"
          >
            <LifeBuoy className="size-4" />
            Помощ
          </a>
          <form action={signOutAction}>
            <button className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-left text-xs text-sidebar-foreground/60 hover:bg-white/5">
              Изход
            </button>
          </form>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-[#f7f4ec]/90 px-5 backdrop-blur lg:px-8">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">
            {context.organizationName}
          </div>
          <Link
            href="/app/orders/new"
            className="rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm"
          >
            + Нова поръчка
          </Link>
        </header>
        <main className="mx-auto max-w-[1480px] p-5 lg:p-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-sidebar p-2 lg:hidden">
          <NavLink
            href="/app"
            label="Обзор"
            icon={<BarChart3 className="size-4" />}
          />
          <NavLink
            href="/app/orders"
            label="Поръчки"
            icon={<FileText className="size-4" />}
          />
          <NavLink
            href="/app/customers"
            label="Клиенти"
            icon={<Contact className="size-4" />}
          />
          <NavLink
            href="/app/settings"
            label="Още"
            icon={<Settings className="size-4" />}
          />
        </nav>
      </section>
    </div>
  );
}
