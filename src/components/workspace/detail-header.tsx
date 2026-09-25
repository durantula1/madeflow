import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

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
  "inline-flex h-10 max-w-full shrink-0 items-center gap-2 self-start rounded-xl border bg-card px-3 text-sm font-medium text-foreground shadow-sm xl:max-w-56";

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
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:gap-4">
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
      <div className="min-w-0 flex-1 xl:min-w-64">
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
        <div className={`min-w-0 self-start xl:max-w-sm xl:shrink-0 xl:[&>div]:justify-end ${actionClassName ?? ""}`}>
          {action}
        </div>
      )}
    </div>
  );
}

/** Real back button and layout; only the record's own title and metadata are placeholders. */
export function DetailHeaderSkeleton({ backLabel, action = true }: {
  /** Omit when the back target depends on the record (the label is then a placeholder too). */
  backLabel?: string;
  action?: boolean;
}) {
  return (
    <DetailHeader
      loading
      backLabel={backLabel ?? <span className="flex h-5 items-center"><Skeleton className="h-3.5 w-20" /></span>}
      title={<div className="flex h-[1.875rem] items-center"><Skeleton className="h-6 w-64 max-w-full" /></div>}
      status={<Skeleton className="h-5 w-20 rounded-full" />}
      metadata={<span className="flex h-5 items-center"><Skeleton className="h-3.5 w-56 max-w-full" /></span>}
      action={action ? <Skeleton className="h-8 w-32 rounded-lg" /> : undefined}
    />
  );
}
