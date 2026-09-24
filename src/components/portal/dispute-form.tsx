"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { disputeDecisionAction, type DecisionState } from "@/modules/change-portal/actions";

export function PortalDisputeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<DecisionState, FormData>(disputeDecisionAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="mb-2 block text-sm font-medium">Какво се е случило? (по желание)</span>
        <Textarea name="reason" maxLength={1000} className="bg-background" />
      </label>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" variant="destructive" className="h-12 w-full text-base" isDisabled={pending}>
        {pending ? "Моля, изчакай…" : "Оспорвам това решение"}
      </Button>
    </form>
  );
}
