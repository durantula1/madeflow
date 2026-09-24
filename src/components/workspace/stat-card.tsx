import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Value rows have a minimum line box so the loaded number is exactly as tall as its placeholder. */
const valueSizes = {
  sm: "min-h-7 text-base sm:text-lg",
  md: "min-h-7 text-lg leading-snug sm:text-xl",
  lg: "min-h-8 text-xl sm:text-2xl",
  xl: "min-h-9 text-3xl tracking-tight",
};

export function StatCard({ label, value, size = "md", icon }: {
  label: ReactNode;
  value: ReactNode;
  size?: keyof typeof valueSizes;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className={cn("mt-2 flex items-center font-semibold", valueSizes[size])}>{value}</div>
        </div>
        {icon ? <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span> : null}
      </CardContent>
    </Card>
  );
}

/** Keeps the real label (it is static) and greys out only the value. */
export function StatCardSkeleton({ label, size = "md", icon }: {
  label?: ReactNode;
  size?: keyof typeof valueSizes;
  icon?: ReactNode;
}) {
  return <StatCard
    size={size}
    icon={icon}
    label={label ?? <span className="flex h-5 items-center"><Skeleton className="h-3.5 w-24" /></span>}
    value={<Skeleton className={cn("w-28", size === "sm" || size === "md" ? "h-5" : "h-6")} />}
  />;
}
