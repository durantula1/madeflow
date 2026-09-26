import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Contact,
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
import { seesClients } from "@/modules/clients/access";
import { NavigationProgress } from "@/components/workspace/navigation-progress";
import { DownloadTray } from "@/components/workspace/download-tray";
import { MobileMoreMenu } from "@/components/workspace/mobile-more-menu";
import { UnreadBadge } from "@/components/workspace/unread-badge";
import { UserMenu } from "@/components/workspace/user-menu";
import { ActionNotice } from "@/components/workspace/action-notice";
import { AppBreadcrumb } from "@/components/workspace/app-breadcrumb";
import { SidebarToggle } from "@/components/workspace/sidebar-toggle";
import { SIDEBAR_COOKIE, WORKSPACE_SHELL_ID } from "@/components/workspace/sidebar-state";
import { DeletionPendingBanner } from "@/components/settings/account-dialogs";
import { can, roleLabel } from "@/lib/authz/permissions";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";
import { accountDeletionDate } from "@/lib/legal";
import { getAccountSummary } from "@/modules/account/queries";
import { countUnreadNotifications } from "@/modules/notifications/queries";

const deletionDateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getOptionalTenantContext();
  if (!context) redirect("/onboarding");
  // Streamed into the badge so the shell never waits on it. The layout re-renders on the realtime
  // refresh LiveNotifications triggers for each new notification, which is what keeps the badge live.
  const unread = countUnreadNotifications(context.organizationId, context.userId);
  const unreadBadge = <Suspense fallback={null}><UnreadBadge count={unread} /></Suspense>;
  const [account, cookieStore] = await Promise.all([getAccountSummary(context.userId), cookies()]);
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";
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
    <div id={WORKSPACE_SHELL_ID} data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} className="group/shell min-h-dvh bg-background transition-[padding] duration-200 motion-reduce:transition-none lg:pl-60 lg:data-[sidebar=collapsed]:pl-16">
      <Suspense fallback={null}><NavigationProgress /></Suspense>
      <LiveNotifications userId={context.userId} />
      <Suspense fallback={null}><ActionNotice /></Suspense>
      <aside className="hidden flex-col overflow-x-hidden border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground transition-[width,padding] duration-200 motion-reduce:transition-none lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:h-dvh lg:w-60 lg:overflow-y-auto lg:group-data-[sidebar=collapsed]/shell:w-16 lg:group-data-[sidebar=collapsed]/shell:px-2">
        <Wordmark inverse className="px-2 py-2 lg:group-data-[sidebar=collapsed]/shell:px-1.5" textClassName="lg:group-data-[sidebar=collapsed]/shell:sr-only" />
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
          {seesClients(context) ? <NavLink href="/app/clients" label="Клиенти" icon={<Contact className="size-4" />} /> : null}
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
            badge={unreadBadge}
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
      <SidebarToggle />
      <section className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:h-12 lg:px-6">
          <Wordmark href="/app" className="lg:hidden" />
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <AppBreadcrumb organizationName={context.organizationName} />
          </div>
          <div className="lg:hidden">
            <UserMenu variant="header" {...userMenu} />
          </div>
        </header>
        {/* Collapsing gives the content the 11rem the sidebar frees (w-60 → w-16), not just a left shift. */}
        <main className="max-w-content p-4 transition-[max-width] duration-200 motion-reduce:transition-none sm:p-6 lg:group-data-[sidebar=collapsed]/shell:max-w-[93.5rem]">
          {pendingDeletion ? <div className="mb-6"><DeletionPendingBanner deleteOn={deletionDateFormat.format(accountDeletionDate(pendingDeletion))} companyName={account?.closureRequested ? context.organizationName : null} /></div> : null}
          {children}
        </main>
        <DownloadTray aboveMobileNav />
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
            badge={unreadBadge}
            variant="tab"
          />
          <MobileMoreMenu owner={context.role === "owner"} finance={can(context, "finance.view")} clients={seesClients(context)} />
        </nav>
      </section>
    </div>
  );
}
