"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

/** Labels match the sidebar, so the last crumb reads as the page title. */
const labels: Record<string, string> = {
  "/app": "Работен преглед",
  "/app/projects": "Обекти",
  "/app/projects/new": "Нов обект",
  "/app/offers": "Оферти",
  "/app/offers/new": "Нова оферта",
  "/app/offers/changes/new": "Нова промяна",
  "/app/notifications": "Известия",
  "/app/team": "Екип",
  "/app/finance": "Плащания",
  "/app/catalog": "Каталог",
  "/app/guide": "Как работи",
  "/app/settings": "Настройки",
  "/app/settings/notifications": "Известия",
  "/app/settings/security": "Сигурност",
  "/app/settings/privacy": "Данни и поверителност",
  "/app/settings/organization": "Фирма",
};

/**
 * Organization › section › page, derived from the URL. Dynamic segments (a project, an
 * offer, a member) are not labelled yet, so detail pages end at their parent section.
 */
export function AppBreadcrumb({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments
    .map((_, index) => "/" + segments.slice(0, index + 1).join("/"))
    // "/app" is the organization crumb itself; it only gets its own label on the dashboard.
    .filter((href) => href in labels && (href !== "/app" || pathname === "/app"))
    .map((href) => ({ href, label: labels[href] }));

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="max-w-56">
          <BreadcrumbLink href="/app">{organizationName}</BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.href === pathname
                ? <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                : <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
