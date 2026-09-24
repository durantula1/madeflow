import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** One titled block of a settings page. `danger` marks irreversible actions. */
export function SettingsSection({ title, description, danger = false, children }: {
  title: string;
  description?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={cn(danger && "ring-destructive/30")}>
      <CardHeader>
        <CardTitle className={cn(danger && "text-destructive")}>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
