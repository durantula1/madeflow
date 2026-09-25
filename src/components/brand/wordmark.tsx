import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  inverse = false,
  className,
  href,
  textClassName,
}: {
  inverse?: boolean;
  className?: string;
  textClassName?: string;
  href?: string | null;
}) {
  const content = (
    <>
      <Image
        src="/pakto-mark.svg"
        alt=""
        width={36}
        height={36}
        loading="eager"
        className="size-9 shrink-0"
      />
      <span
        className={cn(
          "text-[1.1875rem] font-extrabold tracking-[-0.05em]",
          inverse ? "text-[#fffaf0]" : "text-[#102b38]",
          textClassName,
        )}
      >
        Pakto
      </span>
    </>
  );
  const classes = cn("inline-flex items-center gap-2.5", className);

  if (href === null) return <span className={classes}>{content}</span>;
  return (
    <Link href={href ?? (inverse ? "/app" : "/")} className={classes}>
      {content}
    </Link>
  );
}
