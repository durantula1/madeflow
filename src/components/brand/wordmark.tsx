import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  inverse = false,
  className,
  href,
}: {
  inverse?: boolean;
  className?: string;
  href?: string | null;
}) {
  const content = (
    <>
      <Image
        src="/madeflow-mark.svg"
        alt=""
        width={36}
        height={36}
        loading="eager"
        className="size-9 shrink-0"
      />
      <span
        className={cn(
          "text-[19px] font-extrabold tracking-[-0.05em]",
          inverse ? "text-[#fffaf0]" : "text-[#102b38]",
        )}
      >
        Made
        <span className={inverse ? "text-[#bceba8]" : "text-[#e86650]"}>
          Flow
        </span>
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
