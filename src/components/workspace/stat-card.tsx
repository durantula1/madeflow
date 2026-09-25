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

/** A tone carries meaning: mint agreed, teal received, sand still due, blue time, coral needs attention. */
const tones = {
  default: "",
  mint: "bg-tile-mint text-tile-mint-foreground ring-transparent",
  teal: "bg-tile-teal text-tile-teal-foreground ring-transparent",
  blue: "bg-tile-blue text-tile-blue-foreground ring-transparent",
  sand: "bg-tile-sand text-tile-sand-foreground ring-transparent",
  coral: "bg-tile-coral text-tile-coral-foreground ring-transparent",
};

export type StatTone = keyof typeof tones;

export function StatCard({ label, value, size = "md", icon, tone = "default", hint }: {
  label: ReactNode;
  value: ReactNode;
  size?: keyof typeof valueSizes;
  icon?: ReactNode;
  tone?: StatTone;
  /** One short line under the value, e.g. "32% от договореното". */
  hint?: ReactNode;
}) {
  const toned = tone !== "default";
  return (
    <Card className={tones[tone]}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-sm", toned ? "opacity-75" : "text-muted-foreground")}>{label}</p>
          <div className={cn("mt-2 flex items-center font-semibold tabular-nums", valueSizes[size])}>{value}</div>
          {hint !== undefined ? <div className={cn("mt-1 flex min-h-4 items-center text-xs", toned ? "opacity-75" : "text-muted-foreground")}>{hint}</div> : null}
        </div>
        {icon ? <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", toned ? "bg-card/60" : "bg-primary/10 text-primary")}>{icon}</span> : null}
      </CardContent>
    </Card>
  );
}

/** Keeps the real label (it is static) and greys out only the value. */
export function StatCardSkeleton({ label, size = "md", icon, tone, hint = false }: {
  label?: ReactNode;
  size?: keyof typeof valueSizes;
  icon?: ReactNode;
  tone?: StatTone;
  hint?: boolean;
}) {
  return <StatCard
    size={size}
    icon={icon}
    tone={tone}
    label={label ?? <span className="flex h-5 items-center"><Skeleton className="h-3.5 w-24" /></span>}
    value={<Skeleton className={cn("w-28", size === "sm" || size === "md" ? "h-5" : "h-6")} />}
    hint={hint ? <Skeleton className="h-3 w-24" /> : undefined}
  />;
}
