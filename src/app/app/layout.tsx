import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Compass,
  Bell,
  Building2,
  CirclePlus,
  FileText,
  Euro,
  LayoutDashboard,
  Users,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { LiveNotifications } from "@/components/workspace/live-notifications";
import { NavLink } from "@/components/workspace/nav-link";
import { MobileMoreMenu } from "@/components/workspace/mobile-more-menu";
import { UserMenu } from "@/components/workspace/user-menu";
import { ActionNotice } from "@/components/workspace/action-notice";
import { DeletionPendingBanner } from "@/components/settings/account-dialogs";
import { can, roleLabel } from "@/lib/authz/permissions";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { accountDeletionDate } from "@/lib/legal";
import { getAccountSummary } from "@/modules/account/queries";

const deletionDateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getOptionalTenantContext();
  if (!context) redirect("/onboarding");
  const account = await getAccountSummary(context.userId);
  const pendingDeletion = account?.deletionRequestedAt ?? null;
  const userMenu = {
    name: account?.displayName ?? "Профил",
    email: account?.email ?? "",
    roleLabel: roleLabel(context),
    organizationName: context.organizationName,
    owner: context.role === "owner",
  };
  const quickCreate = can(context, "offers.edit")
    ? { href: "/app/offers/new", label: "Нова оферта" }
    : can(context, "changes.draft")
      ? { href: "/app/offers/changes/new", label: "Нова промяна" }
      : null;
  return (
    <div className="min-h-dvh bg-background lg:pl-60">
      <LiveNotifications userId={context.userId} />
      <Suspense fallback={null}><ActionNotice /></Suspense>
      <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:h-dvh lg:w-60 lg:overflow-y-auto">
        <Wordmark inverse className="px-2 py-2" />
        <nav className="mt-8 space-y-1">
          <NavLink
            href="/app"
            label="Работен преглед"
            icon={<LayoutDashboard className="size-4" />}
          />
          <NavLink
            href="/app/projects"
            label="Обекти"
            icon={<Building2 className="size-4" />}
          />
          <NavLink
            href="/app/offers"
            label="Оферти"
            icon={<FileText className="size-4" />}
          />
          <NavLink href="/app/catalog" label="Каталог" icon={<BookOpen className="size-4" />} />
          <NavLink
            href="/app/notifications"
            label="Известия"
            icon={<Bell className="size-4" />}
          />
          {context.role === "owner" ? <NavLink href="/app/team" label="Екип" icon={<Users className="size-4" />} /> : null}
          {can(context, "finance.view") ? <NavLink href="/app/finance" label="Плащания" icon={<Euro className="size-4" />} /> : null}
          <div className="my-3 border-t border-sidebar-border" />
          <NavLink href="/app/guide" label="Как работи" icon={<Compass className="size-4" />} />
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-3">
          <UserMenu variant="sidebar" {...userMenu} />
        </div>
      </aside>
      <section className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <Wordmark href="/app" className="lg:hidden" />
          <p className="hidden text-sm text-muted-foreground lg:block">
            {context.organizationName}
          </p>
          <div className="lg:hidden">
            <UserMenu variant="header" {...userMenu} />
          </div>
        </header>
        <main className="max-w-[1320px] p-4 sm:p-6 lg:p-8">
          {pendingDeletion ? <div className="mb-6"><DeletionPendingBanner deleteOn={deletionDateFormat.format(accountDeletionDate(pendingDeletion))} companyName={account?.closureRequested ? context.organizationName : null} /></div> : null}
          {children}
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center gap-1 border-t border-sidebar-border bg-sidebar px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 text-sidebar-foreground lg:hidden">
          <NavLink
            href="/app/projects"
            label="Обекти"
            icon={<Building2 className="size-5" />}
            variant="tab"
          />
          <NavLink
            href="/app/offers"
            label="Оферти"
            icon={<FileText className="size-5" />}
            variant="tab"
          />
          {quickCreate ? <Link
            href={quickCreate.href}
            prefetch={true}
            aria-label={quickCreate.label}
            className="mx-auto grid size-12 -translate-y-4 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground shadow-lg ring-4 ring-sidebar"
          >
            <CirclePlus className="size-6" />
          </Link> : <span />}
          <NavLink
            href="/app/notifications"
            label="Известия"
            icon={<Bell className="size-5" />}
            variant="tab"
          />
          <MobileMoreMenu owner={context.role === "owner"} finance={can(context, "finance.view")} />
        </nav>
      </section>
    </div>
  );
}
