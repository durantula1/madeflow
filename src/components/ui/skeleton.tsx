import { cn } from "@/lib/utils"

// A block-level <span>, not a <div>: placeholders often sit inside <p> labels
// (stat cards, detail headers), where a <div> is invalid HTML and breaks hydration.
function Skeleton({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="skeleton"
      className={cn("skeleton block rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
