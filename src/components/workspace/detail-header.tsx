import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type DetailHeaderProps = {
  backHref?: string;
  backLabel: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  metadata: ReactNode;
  action?: ReactNode;
  actionClassName?: string;
  loading?: boolean;
};

const backClassName =
  "inline-flex h-10 max-w-full shrink-0 items-center gap-2 self-start rounded-xl border bg-card px-3 text-sm font-medium text-foreground shadow-sm lg:max-w-56";

export function DetailHeader({
  backHref,
  backLabel,
  title,
  status,
  metadata,
  action,
  actionClassName,
  loading = false,
}: DetailHeaderProps) {
  const backContent = (
    <>
      <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 truncate">{backLabel}</div>
    </>
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
      {backHref ? (
        <Link
          href={backHref}
          className={`${backClassName} hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
        >
          {backContent}
        </Link>
      ) : (
        <div className={backClassName} aria-hidden="true">
          {backContent}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {loading ? (
            <div className="min-w-0">{title}</div>
          ) : (
            <h1 className="min-w-0 text-2xl font-semibold leading-tight tracking-tight break-words">
              {title}
            </h1>
          )}
          {status}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {metadata}
        </div>
      </div>
      {action && (
        <div className={`shrink-0 self-start ${actionClassName ?? ""}`}>
          {action}
        </div>
      )}
    </div>
  );
}
