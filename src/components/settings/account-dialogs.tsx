"use client";

import Link from "next/link";
import { Download, TriangleAlert } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { cn } from "@/lib/utils";
import type { AccountDeletionPlan, Blocker } from "@/modules/account/queries";
import {
  cancelAccountDeletionAction, leaveOrganizationAction, requestAccountDeletionAction, signOutEverywhereAction,
} from "@/modules/account/actions";

/** Explains why the button above is disabled and links to the fix, when there is one. */
function BlockerNote({ blocker }: { blocker: Blocker }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p>
        {blocker.message}
        {blocker.href ? <> <Link href={blocker.href} className="font-medium text-foreground underline underline-offset-4">{blocker.cta ?? "Отвори"}</Link></> : null}
      </p>
    </div>
  );
}

/** A plain download link styled as a button; the export route sends the file as an attachment. */
export function ExportDataLink({ href = "/api/account/export", label = "Изтегли данните (JSON)" }: { href?: string; label?: string }) {
  return (
    <a href={href} download className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-2")}>
      <Download className="size-4" /> {label}
    </a>
  );
}

export function SignOutEverywhereDialog() {
  return (
    <DialogTrigger>
      <Button type="button" variant="outline" className="h-10">Изход от всички устройства</Button>
      <Dialog>
        <DialogHeader>
          <DialogTitle>Изход от всички устройства?</DialogTitle>
          <DialogDescription>Ще излезеш и от това устройство. После влизаш отново с имейла и паролата си.</DialogDescription>
        </DialogHeader>
        <ActionForm action={signOutEverywhereAction} success="" redirects className="flex justify-end">
          <ActionSubmit>Излез навсякъде</ActionSubmit>
        </ActionForm>
      </Dialog>
    </DialogTrigger>
  );
}

export function LeaveOrganizationDialog({ organizationName, blocker }: { organizationName: string; blocker: Blocker | null }) {
  return (
    <div>
      <DialogTrigger>
        <Button type="button" variant="destructive" className="h-10" isDisabled={!!blocker}>Напусни фирмата</Button>
        <Dialog>
          <DialogHeader>
            <DialogTitle>Да напуснеш „{organizationName}“?</DialogTitle>
            <DialogDescription>
              Губиш достъп до обектите и документите веднага. Собствениците ще получат известие.
              Профилът ти остава и може да бъдеш поканен отново.
            </DialogDescription>
          </DialogHeader>
          <ActionForm action={leaveOrganizationAction} success="" redirects className="flex justify-end">
            <ActionSubmit variant="destructive">Напусни</ActionSubmit>
          </ActionForm>
        </Dialog>
      </DialogTrigger>
      {blocker ? <BlockerNote blocker={blocker} /> : null}
    </div>
  );
}

export function DeleteAccountDialog({ plan, graceDays }: { plan: AccountDeletionPlan; graceDays: number }) {
  const company = plan.kind === "account_and_company" ? plan.organizationName : null;
  return (
    <div>
      <DialogTrigger>
        <Button type="button" variant="destructive" className="h-10" isDisabled={plan.kind === "blocked"}>
          {company ? "Изтрий профила и фирмата" : "Изтрий профила"}
        </Button>
        <Dialog className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{company ? "Изтриване на профила и фирмата" : "Изтриване на профила"}</DialogTitle>
            <DialogDescription>
              {company
                ? <>Ти си единственият член на „{company}“. Заедно с профила ще изтрием фирмата, всички обекти, документи, плащания и клиентски линкове.</>
                : "Ще излезеш от всички устройства."}{" "}
              Изтриването става след {graceDays} дни. Дотогава можеш да влезеш и да го отмениш.
            </DialogDescription>
          </DialogHeader>
          {company ? (
            <p className="rounded-xl bg-muted px-3 py-2.5 text-sm">
              Първо <a href="/api/organization/export" download className="font-medium underline underline-offset-4">изтегли данните на фирмата</a>. Може да ти трябват за счетоводството.
            </p>
          ) : null}
          <ActionForm action={requestAccountDeletionAction} success="" redirects className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="delete-password">Парола</FieldLabel>
              <Input id="delete-password" name="password" type="password" autoComplete="current-password" required className="h-10" />
            </Field>
            {company ? (
              <Field>
                <FieldLabel htmlFor="delete-company">Напиши името на фирмата</FieldLabel>
                <Input id="delete-company" name="organizationName" autoComplete="off" required placeholder={company} className="h-10" />
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor="delete-confirmation">Напиши ИЗТРИЙ</FieldLabel>
              <Input id="delete-confirmation" name="confirmation" autoComplete="off" required className="h-10" />
              <FieldDescription>Така няма да изтриеш нищо по невнимание.</FieldDescription>
            </Field>
            <ActionSubmit variant="destructive" className="h-10">Изтрий след {graceDays} дни</ActionSubmit>
          </ActionForm>
        </Dialog>
      </DialogTrigger>
      {plan.kind === "blocked" ? <BlockerNote blocker={plan} /> : null}
    </div>
  );
}

export function DeletionPendingBanner({ deleteOn, companyName }: { deleteOn: string; companyName?: string | null }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        <span className="font-semibold text-destructive">{companyName ? `Профилът ти и фирмата „${companyName}“ ще бъдат изтрити на ${deleteOn}.` : `Профилът ти ще бъде изтрит на ${deleteOn}.`}</span>{" "}
        <span className="text-muted-foreground">Докато не отмениш, можеш да работиш както обикновено.</span>
      </p>
      <ActionForm action={cancelAccountDeletionAction} success="Изтриването е отменено" className="shrink-0">
        <ActionSubmit variant="outline" className="h-10">Отмени изтриването</ActionSubmit>
      </ActionForm>
    </div>
  );
}
