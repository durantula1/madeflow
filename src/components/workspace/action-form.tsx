"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ActionForm({ action, success, children, className, redirects = false }: {
  action: (formData: FormData) => Promise<unknown>;
  success: string;
  children: React.ReactNode;
  className?: string;
  redirects?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    try {
      const result = await action(formData);
      // Expected failures come back as `{ error }`: production builds hide thrown messages.
      if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      if (!redirects) toast.success(success);
    } catch (cause) {
      if (cause instanceof Error && cause.message.includes("NEXT_REDIRECT")) throw cause;
      const message = cause instanceof Error ? cause.message : "Действието не беше завършено. Опитай отново.";
      setError(message);
      toast.error(message);
    }
  }

  return <form action={submit} className={className}>
    {children}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </form>;
}

export function ActionSubmit({ children, variant = "default", className }: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return <Button type="submit" variant={variant} className={className} isDisabled={pending}>
    {pending ? "Моля, изчакай…" : children}
  </Button>;
}
