import { headers } from "next/headers";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Building2,
  CirclePlus,
  ClipboardList,
  FileText,
  Euro,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { LiveNotifications } from "@/components/workspace/live-notifications";
import { NavLink } from "@/components/workspace/nav-link";
import { MobileMoreMenu } from "@/components/workspace/mobile-more-menu";
import { ActionNotice } from "@/components/workspace/action-notice";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { signOutAction } from "@/modules/auth/actions";
import { getDocumentKind } from "@/modules/change-orders/queries";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getOptionalTenantContext();
  if (!context) redirect("/onboarding");
  const pathname = (await headers()).get("x-pathname") ?? "";
  const detailId = pathname.match(/^\/app\/changes\/([^/]+)$/)?.[1];
  const detailKind =
    detailId && detailId !== "new"
      ? await getDocumentKind(context.organizationId, detailId)
      : null;
  const activeHref =
    detailKind === "offer"
      ? "/app/offers"
      : detailKind === "change"
        ? "/app/changes"
        : undefined;
  return (
    <div className="min-h-dvh bg-background lg:pl-60">
      <LiveNotifications userId={context.userId} />
      <Suspense fallback={null}><ActionNotice /></Suspense>
      <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:h-dvh lg:w-60 lg:overflow-y-auto">
        <Wordmark inverse className="px-2 py-2" />
        <div className="mt-7 max-w-40 px-3 py-3">
          <p className="truncate text-sm font-medium">
            {context.organizationName}
          </p>
          <p className="mt-1 text-xs text-sidebar-foreground/45">
            {context.role === "owner"
              ? "Собственик"
              : context.role === "admin"
                ? "Администратор"
                : context.role === "field"
                  ? "Ръководител обект"
                  : context.role === "office"
                    ? "Офис"
                    : "Екип"}
          </p>
        </div>
        <nav className="mt-6 space-y-1">
          <NavLink
            href="/app"
            label="Работен преглед"
            icon={<LayoutDashboard className="size-4" />}
            activeHref={activeHref}
          />
          <NavLink
            href="/app/projects"
            label="Обекти"
            icon={<Building2 className="size-4" />}
            activeHref={activeHref}
          />
          <NavLink
            href="/app/offers"
            label="Оферти"
            icon={<FileText className="size-4" />}
            activeHref={activeHref}
          />
          <NavLink
            href="/app/changes"
            label="Промени"
            icon={<ClipboardList className="size-4" />}
            activeHref={activeHref}
          />
          <NavLink
            href="/app/notifications"
            label="Известия"
            icon={<Bell className="size-4" />}
            activeHref={activeHref}
          />
          {context.role === "owner" ? <NavLink href="/app/team" label="Екип" icon={<Users className="size-4" />} activeHref={activeHref} /> : null}
          {context.role !== "field" ? <NavLink href="/app/finance" label="Плащания" icon={<Euro className="size-4" />} activeHref={activeHref} /> : null}
        </nav>
        <div className="mt-auto space-y-1">
          {context.role === "owner" ? <NavLink
            href="/app/settings"
            label="Настройки"
            icon={<Settings className="size-4" />}
            activeHref={activeHref}
          /> : null}
          <form action={signOutAction}>
            <button className="mt-2 min-h-11 w-full rounded-xl border border-sidebar-border px-3 text-left text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent">
              Изход
            </button>
          </form>
        </div>
      </aside>
      <section className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Wordmark href="/app" className="lg:hidden" />
          <p className="hidden text-sm text-muted-foreground lg:block">
            {context.organizationName}
          </p>
          {context.role === "owner" ? <Link
            href="/app/settings"
            className="grid size-10 place-items-center rounded-lg lg:hidden"
            aria-label="Настройки"
          >
            <Settings className="size-4" />
          </Link> : null}
        </header>
        <main className="mx-auto max-w-[1320px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sidebar-border bg-sidebar px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 text-sidebar-foreground lg:hidden">
          <NavLink
            href="/app/projects"
            label="Обекти"
            icon={<Building2 className="size-5" />}
            activeHref={activeHref}
          />
          <NavLink
            href="/app/offers"
            label="Оферти"
            icon={<FileText className="size-5" />}
            activeHref={activeHref}
          />
          <Link
            href={context.role === "field" ? "/app/changes/new" : "/app/offers/new"}
            prefetch={true}
            aria-label={context.role === "field" ? "Нова промяна" : "Нова оферта"}
            className="mx-auto grid size-12 -translate-y-4 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-4 ring-sidebar"
          >
            <CirclePlus className="size-6" />
          </Link>
          <NavLink
            href="/app/changes"
            label="Промени"
            icon={<ClipboardList className="size-5" />}
            activeHref={activeHref}
          />
          <MobileMoreMenu role={context.role} />
        </nav>
      </section>
    </div>
  );
}
