"use client";

import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ConfirmAction({ label, description, action, field, value, success }: {
  label: string;
  description: string;
  action: (formData: FormData) => Promise<unknown>;
  field: string;
  value: string;
  success: string;
}) {
  return <DialogTrigger>
    <Button type="button" variant="destructive" size="sm">{label}</Button>
    <Dialog>
      <DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <ActionForm action={action} success={success} className="flex justify-end gap-2">
        <input type="hidden" name={field} value={value} />
        <ActionSubmit variant="destructive">Потвърди</ActionSubmit>
      </ActionForm>
    </Dialog>
  </DialogTrigger>;
}
