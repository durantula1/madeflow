import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** A form card with label and input placeholders; inputs match the `h-11` / `h-10` form controls. */
export function FormSkeleton({ title, fields = 6, inputClassName = "h-11" }: {
  title?: string;
  fields?: number;
  inputClassName?: string;
}) {
  return (
    <Card>
      {title ? <CardHeader><CardTitle>{title}</CardTitle></CardHeader> : null}
      <CardContent className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-24" /></div>
            <Skeleton className={`${inputClassName} w-full rounded-lg`} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
