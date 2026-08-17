import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return <Link href="/" className={cn("inline-flex items-center gap-2", className)}><span className={cn("grid size-8 place-items-center rounded-xl text-sm font-black shadow-sm", inverse ? "bg-[#8ac99a] text-[#183423]" : "bg-primary text-primary-foreground")}>M</span><span className={cn("text-lg font-semibold tracking-tight", inverse && "text-white")}>MadeFlow</span></Link>;
}
