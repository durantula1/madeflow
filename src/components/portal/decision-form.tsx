"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitPortalDecisionAction } from "@/modules/change-portal/actions";

export function PortalDecisionForm({
  projectPublicId,
  changeOrderId,
  revisionId,
  total,
  currency,
  revisionNumber,
  idempotencyKey,
}: {
  projectPublicId: string;
  changeOrderId: string;
  revisionId: number;
  total: string;
  currency: string;
  revisionNumber: number;
  idempotencyKey: string;
}) {
  const [decision, setDecision] = useState<
    "approved" | "declined" | "changes_requested"
  >("approved");
  return (
    <form action={submitPortalDecisionAction} className="space-y-4">
      <input type="hidden" name="projectPublicId" value={projectPublicId} />
      <input type="hidden" name="changeOrderId" value={changeOrderId} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={decision === "approved" ? "default" : "outline"}
          onPress={() => setDecision("approved")}
          className="h-auto min-h-12 flex-col gap-1"
        >
          <CheckCircle2 /> Одобрявам
        </Button>
        <Button
          type="button"
          variant={decision === "changes_requested" ? "default" : "outline"}
          onPress={() => setDecision("changes_requested")}
          className="h-auto min-h-12 flex-col gap-1"
        >
          <MessageSquareText /> Промяна
        </Button>
        <Button
          type="button"
          variant={decision === "declined" ? "destructive" : "outline"}
          onPress={() => setDecision("declined")}
          className="h-auto min-h-12 flex-col gap-1"
        >
          <XCircle /> Отказвам
        </Button>
      </div>
      <div className="rounded-xl border bg-muted/40 p-4">
        <p className="text-sm font-medium">
          {decision === "approved"
            ? `Одобряваш ${Number(total).toFixed(2)} ${currency}, версия ${revisionNumber}.`
            : decision === "changes_requested"
              ? "Опиши какво трябва да се промени."
              : "Отказът се записва към тази версия."}
        </p>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium">Твоето име</span>
          <Input name="typedName" required className="h-11 bg-background" />
        </label>
        {decision !== "approved" && (
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium">
              Коментар{" "}
              {decision === "changes_requested" ? "(задължителен)" : ""}
            </span>
            <Textarea
              name="comment"
              required={decision === "changes_requested"}
              className="bg-background"
            />
          </label>
        )}
        {decision === "approved" && (
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" required className="mt-1 size-4" />
            <span>
              Потвърждавам, че прегледах и одобрявам точно тази версия и
              посочената крайна сума.
            </span>
          </label>
        )}
      </div>
      <Button type="submit" className="h-12 w-full text-base">
        {decision === "approved"
          ? "Потвърди одобрението"
          : decision === "changes_requested"
            ? "Изпрати искането"
            : "Потвърди отказа"}
      </Button>
    </form>
  );
}
