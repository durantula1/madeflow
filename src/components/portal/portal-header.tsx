import { MapPin } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function PortalHeader({ eyebrow, title, address, meta, aside, children }: {
  eyebrow: React.ReactNode;
  title: string;
  address?: string | null;
  meta?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
          {address ? <p className="mt-2 flex items-center gap-2 text-sm text-sidebar-foreground/70"><MapPin className="size-4 shrink-0" /> {address}</p> : null}
          {meta ? <div className="mt-2 text-sm text-sidebar-foreground/70">{meta}</div> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children ? <div className="mt-4 border-t border-sidebar-border pt-4">{children}</div> : null}
    </header>
  );
}

/** Same frame as `PortalHeader`, for the portal's loading states. */
export function PortalHeaderSkeleton({ address = false }: { address?: boolean }) {
  return (
    <header className="rounded-2xl bg-sidebar p-5 shadow-sm sm:p-6">
      <Skeleton className="h-4 w-32 bg-white/10" />
      <Skeleton className="mt-2 h-8 w-64 max-w-full bg-white/15" />
      {address ? <Skeleton className="mt-3 h-4 w-48 max-w-full bg-white/10" /> : null}
      <Skeleton className="mt-3 h-4 w-40 max-w-full bg-white/10" />
    </header>
  );
}
