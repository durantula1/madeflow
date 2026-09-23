"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="flex gap-2 rounded-xl border bg-card p-2">
    <Input aria-label="Линк за покана" readOnly value={url} className="h-9 min-w-0 flex-1" />
    <Button type="button" onPress={async () => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Линкът е копиран");
      } catch {
        toast.error("Линкът не може да бъде копиран");
      }
    }}>{copied ? <Check /> : <Copy />}{copied ? "Копирано" : "Копирай"}</Button>
  </div>;
}
