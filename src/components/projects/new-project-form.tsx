"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { createProjectAction } from "@/modules/projects/actions";

/** One column, so it reads the same in the side panel and on the fallback page. */
export function NewProjectForm() {
  return (
    <ActionForm action={createProjectAction} success="Обектът е създаден" redirects className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="project-name">Име на обекта</FieldLabel>
        <Input id="project-name" name="name" required autoFocus className="h-11" placeholder="Апартамент Иванови" />
      </Field>
      <Field>
        <FieldLabel htmlFor="project-address">Адрес</FieldLabel>
        <Input id="project-address" name="siteAddress" required className="h-11" placeholder="гр. София, ул. …" />
      </Field>
      <Field>
        <FieldLabel htmlFor="project-reference">Референция</FieldLabel>
        <Input id="project-reference" name="reference" className="h-11" placeholder="OBJ-2026-04" />
        <FieldDescription>По желание. Твой вътрешен номер или код.</FieldDescription>
      </Field>

      <div className="border-t pt-5">
        <p className="font-medium">Клиент, който одобрява</p>
        <p className="text-sm text-muted-foreground">Получава защитен линк към офертите, без да създава акаунт.</p>
      </div>
      <Field>
        <FieldLabel htmlFor="contact-name">Име</FieldLabel>
        <Input id="contact-name" name="contactName" required autoComplete="off" className="h-11" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="contact-email">Имейл</FieldLabel>
          <Input id="contact-email" name="contactEmail" type="email" autoComplete="off" className="h-11" />
        </Field>
        <Field>
          <FieldLabel htmlFor="contact-phone">Телефон</FieldLabel>
          <Input id="contact-phone" name="contactPhone" type="tel" autoComplete="off" className="h-11" />
        </Field>
      </div>
      <ActionSubmit className="h-11">Създай обекта</ActionSubmit>
    </ActionForm>
  );
}

/** "Нов обект" opens a panel over the list instead of a separate page. */
export function NewProjectSheet() {
  const [open, setOpen] = useState(false);
  return (
    <SheetTrigger isOpen={open} onOpenChange={setOpen}>
      <Button type="button" className="min-h-10 gap-2 rounded-xl px-4 font-semibold">
        <Plus className="size-4" /> Нов обект
      </Button>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md data-[side=right]:sm:max-w-md">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-lg font-semibold">Нов обект</SheetTitle>
          <SheetDescription>Добави мястото и човека, който одобрява.</SheetDescription>
        </SheetHeader>
        <div className="px-6 pb-8">
          <NewProjectForm />
        </div>
      </SheetContent>
    </SheetTrigger>
  );
}
