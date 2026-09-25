"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyPortalLink({ url, variant = "default", className = "h-8", label = "Копирай защитения линк", labelClassName }: {
  url: string;
  variant?: "default" | "outline";
  className?: string;
  label?: string;
  /** E.g. `lg:sr-only` for an icon-only button on wide screens; the label stays for screen readers. */
  labelClassName?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      aria-label={labelClassName ? label : undefined}
      onPress={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast.success("Линкът е копиран");
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Линкът не може да бъде копиран");
        }
      }}
    >
      {copied ? <Check /> : <Copy />}{" "}
      <span className={labelClassName}>{copied ? "Копирано" : label}</span>
    </Button>
  );
}
