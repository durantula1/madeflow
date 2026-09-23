import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailHeader } from "@/components/workspace/detail-header";
import {
  workspacePageCopy,
  type WorkspacePage,
} from "@/components/workspace/page-copy";

const actions: Partial<Record<WorkspacePage, { href: string; label: string }>> =
  {
    dashboard: { href: "/app/offers/new", label: "Нова оферта" },
    projects: { href: "/app/projects/new", label: "Нов обект" },
    offers: { href: "/app/offers/new", label: "Нова оферта" },
    changes: { href: "/app/changes/new", label: "Нова промяна" },
  };

const breadcrumbs: Partial<Record<WorkspacePage, string>> = {
  newProject: "← Обекти",
  newOffer: "← Назад",
  newChange: "← Назад",
};

function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y rounded-2xl border bg-card shadow-sm">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex min-h-20 items-center gap-5 px-5 py-4">
          <Skeleton className="h-4 w-20 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3 max-w-72" />
            <Skeleton className="h-3 w-1/2 max-w-48" />
          </div>
          <Skeleton className="hidden h-6 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}

function LoadingCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-9 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function LoadingForm({ bare = false }: { bare?: boolean }) {
  return (
    <div
      className={
        bare
          ? "mt-5 grid gap-5 sm:grid-cols-2"
          : "mt-7 grid gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:grid-cols-2"
      }
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
    </div>
  );
}

function StaticHeading({ page }: { page: WorkspacePage }) {
  const copy = workspacePageCopy[page];
  const eyebrow = "eyebrow" in copy ? copy.eyebrow : undefined;
  const breadcrumb = breadcrumbs[page];
  const action = actions[page];
  const isNew = page.startsWith("new");

  return (
    <div
      className={
        page === "newProject"
          ? "mx-auto max-w-2xl"
          : page === "newOffer"
            ? "mx-auto max-w-5xl"
            : isNew
              ? "mx-auto max-w-3xl"
              : ""
      }
    >
      {breadcrumb && (
        <p className="text-sm text-muted-foreground">{breadcrumb}</p>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div
          className={
            breadcrumb ? "mt-4" : ""
          }
        >
          {eyebrow && (
            <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          )}
          <h1
            className={`font-semibold tracking-tight ${page === "dashboard" ? "mt-1 text-3xl sm:text-4xl" : page === "newOffer" ? "text-2xl" : eyebrow ? "mt-1 text-3xl" : "text-3xl"}`}
          >
            {copy.title}
          </h1>
          <p
            className={
              page === "newOffer"
                ? "mt-1 max-w-2xl text-sm text-muted-foreground"
                : "mt-2 max-w-2xl text-muted-foreground"
            }
          >
            {copy.description}
          </p>
        </div>
        {action && (
          <Link
            href={action.href}
            className={
              page === "dashboard"
                ? "hidden min-h-11 items-center gap-2 font-semibold text-primary lg:flex"
                : page === "projects"
                  ? "flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold"
                  : "hidden min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground lg:flex"
            }
          >
            {page === "dashboard" ? null : (
              <Plus className="size-4" />
            )}
            {action.label}
            {page === "dashboard" && <ArrowRight className="size-4" />}
          </Link>
        )}
      </div>
    </div>
  );
}

export function WorkspacePageLoading({ page }: { page: WorkspacePage }) {
  const isNew = page.startsWith("new");
  const isSearch = page === "projects" || page === "offers" || page === "changes" || page === "team";
  const isCards = page === "projects";
  const isDashboard = page === "dashboard";
  const isSettings = page === "settings";
  const isImmediateForm = page === "newProject";

  return (
    <div aria-busy="true">
      <StaticHeading page={page} />
      {!isImmediateForm && (
        <div
          className={
            page === "newOffer"
              ? "mx-auto max-w-5xl"
              : isNew
                ? "mx-auto max-w-3xl"
                : ""
          }
        >
          {isSearch && <div className="mt-7 flex gap-3 rounded-xl border bg-card p-4"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-36" /></div>}
          {isDashboard ? (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="rounded-2xl border bg-card p-6">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="mt-3 h-9 w-20" />
                  </div>
                ))}
              </div>
              <div className="mt-7">
                <p className="mb-4 font-semibold">Последни документи</p>
                <LoadingRows count={4} />
              </div>
            </>
          ) : isCards ? (
            <div className="mt-7">
              <LoadingCards />
            </div>
          ) : isSettings ? (
            <div className="mt-7 grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="font-semibold">Организация</h2>
                <LoadingForm bare />
              </section>
              <section className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="font-semibold">Шаблони</h2>
                <div className="mt-5">
                  <LoadingRows count={3} />
                </div>
              </section>
            </div>
          ) : isNew ? (
            <LoadingForm />
          ) : (
            <div className={isSearch ? "mt-5" : "mt-7"}>
              {(page === "offers" || page === "changes") && (
                <h2 className="mb-4 font-semibold">
                  {page === "offers" ? "Всички оферти" : "Всички промени"}
                </h2>
              )}
              <LoadingRows />
            </div>
          )}
        </div>
      )}
      <span role="status" className="sr-only">
        Зареждане…
      </span>
    </div>
  );
}

function ProjectDocumentRows({ count }: { count: number }) {
  return (
    <div className="divide-y">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="grid gap-2 px-4 py-4 sm:grid-cols-[80px_1fr_120px] sm:items-center"
        >
          <Skeleton className="h-4 w-12" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-24 sm:justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export function ProjectDetailLoading() {
  return (
    <div aria-busy="true">
      <DetailHeader
        backHref="/app/projects"
        backLabel="Обекти"
        title={<Skeleton className="h-7 w-64 max-w-full" />}
        status={<Skeleton className="h-5 w-16 rounded-full" />}
        metadata={<Skeleton className="h-4 w-40 max-w-full" />}
        action={<Skeleton className="h-11 w-36" />}
        actionClassName="hidden lg:block"
        loading
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Оферти</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProjectDocumentRows count={3} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Промени</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProjectDocumentRows count={1} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Клиентски контакт</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </CardContent>
        </Card>
      </div>
      <span role="status" className="sr-only">
        Зареждане…
      </span>
    </div>
  );
}

export function DocumentDetailLoading() {
  return (
    <div aria-busy="true">
      <DetailHeader
        backLabel={<Skeleton className="h-4 w-28" />}
        title={<Skeleton className="h-7 w-64 max-w-full" />}
        status={<Skeleton className="h-5 w-20 rounded-full" />}
        metadata={
          <>
            <Skeleton className="h-4 w-14" />
            <span aria-hidden="true">·</span>
            <Skeleton className="h-4 w-20" />
            <span aria-hidden="true">·</span>
            <Skeleton className="h-4 w-32" />
          </>
        }
        action={<Skeleton className="h-11 w-44" />}
        actionClassName="hidden lg:block"
        loading
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Преглед за клиента</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-sidebar p-5">
                  <Skeleton className="h-4 w-28 bg-white/20" />
                  <Skeleton className="mt-3 h-9 w-40 bg-white/20" />
                  <Skeleton className="mt-3 h-3 w-32 bg-white/20" />
                </div>
                <div className="rounded-2xl border p-5">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="mt-4 h-6 w-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>История</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex gap-3">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Approver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </aside>
      </div>
      <span role="status" className="sr-only">
        Зареждане…
      </span>
    </div>
  );
}
