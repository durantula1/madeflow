"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, MessageSquareText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  requestDecisionCodeAction,
  submitPortalDecisionAction,
  type DecisionState,
} from "@/modules/change-portal/actions";

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
  const [codeState, requestCode, requesting] = useActionState<DecisionState, FormData>(requestDecisionCodeAction, {});
  const [submitState, submit, submitting] = useActionState<DecisionState, FormData>(submitPortalDecisionAction, {});
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const otpId = codeState.otpId && codeFor === decision ? codeState.otpId : null;
  const error = otpId ? submitState.error : codeState.error;

  function choose(next: typeof decision) {
    setDecision(next);
    setCodeFor(null);
  }

  return (
    <form
      action={otpId ? submit : (formData) => { setCodeFor(decision); return requestCode(formData); }}
      className="space-y-4"
    >
      <input type="hidden" name="projectPublicId" value={projectPublicId} />
      <input type="hidden" name="changeOrderId" value={changeOrderId} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {otpId ? <input type="hidden" name="otpId" value={otpId} /> : null}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={decision === "approved" ? "default" : "outline"}
          onPress={() => choose("approved")}
          className="h-auto min-h-12 flex-col gap-1"
        >
          <CheckCircle2 /> Одобрявам
        </Button>
        <Button
          type="button"
          variant={decision === "changes_requested" ? "default" : "outline"}
          onPress={() => choose("changes_requested")}
          className="h-auto min-h-12 flex-col gap-1"
        >
          <MessageSquareText /> Промяна
        </Button>
        <Button
          type="button"
          variant={decision === "declined" ? "destructive" : "outline"}
          onPress={() => choose("declined")}
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
          <Input name="typedName" required readOnly={!!otpId} value={typedName} onChange={(event) => setTypedName(event.target.value)} className="h-11 bg-background" />
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
              readOnly={!!otpId}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="bg-background"
            />
          </label>
        )}
        {decision === "approved" && (
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={!!otpId} className="mt-1 size-4" />
            <span>
              Потвърждавам, че прегледах и одобрявам точно тази версия и
              посочената крайна сума.
            </span>
          </label>
        )}
        {otpId ? (
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium">
              Код, изпратен до {codeState.sentTo}
            </span>
            <Input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              className="h-11 bg-background font-mono text-lg tracking-[0.4em]"
            />
          </label>
        ) : null}
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-12 w-full text-base" isDisabled={requesting || submitting}>
        {requesting || submitting
          ? "Моля, изчакай…"
          : !otpId
            ? "Изпрати ми код за потвърждение"
            : decision === "approved"
              ? "Потвърди одобрението"
              : decision === "changes_requested"
                ? "Изпрати искането"
                : "Потвърди отказа"}
      </Button>
      {otpId ? (
        <button type="button" onClick={() => setCodeFor(null)} className="w-full text-sm text-muted-foreground underline">
          Не получих код — изпрати нов
        </button>
      ) : null}
    </form>
  );
}
