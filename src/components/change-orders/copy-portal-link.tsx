"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CopyPortalLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      className="h-11"
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
      {copied ? "Копирано" : "Копирай защитения линк"}
    </Button>
  );
}
