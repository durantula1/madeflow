"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, EllipsisVertical, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { saveTemplateFromOfferAction } from "@/modules/catalog/actions";

/** Secondary document actions, kept out of the header's main row so phones see only what matters. */
export function DocumentMoreMenu({ changeOrderId, title, pdfHref, canCopy }: { changeOrderId: string; title: string; pdfHref: string | null; canCopy: boolean }) {
  const router = useRouter();
  const [templateOpen, setTemplateOpen] = useState(false);
  const items = [
    ...(canCopy ? [{ id: "copy", label: "Дублирай като нова оферта", icon: Copy }, { id: "template", label: "Запази като шаблон", icon: LayoutTemplate }] : []),
    ...(pdfHref ? [{ id: "pdf", label: "Свали PDF", icon: Download }] : []),
  ];
  if (!items.length) return null;
  function onAction(key: React.Key) {
    if (key === "copy") router.push(`/app/offers/new?from=${changeOrderId}`);
    if (key === "template") setTemplateOpen(true);
    if (key === "pdf" && pdfHref) window.location.href = pdfHref;
  }
  return (
    <>
      <DropdownMenuTrigger>
        <Button type="button" variant="outline" className="h-8 gap-1.5 bg-card px-2.5" aria-label="Още действия"><EllipsisVertical className="size-4" /> Още</Button>
        <DropdownMenu placement="bottom end" onAction={onAction} className="min-w-56">
          {items.map((item) => (
            <DropdownMenuItem key={item.id} id={item.id} textValue={item.label} className="min-h-11 gap-2">
              <item.icon className="size-4" /> {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      </DropdownMenuTrigger>
      <SaveTemplateDialog open={templateOpen} onOpenChange={setTemplateOpen} changeOrderId={changeOrderId} defaultName={title} />
    </>
  );
}

function SaveTemplateDialog({ open, onOpenChange, changeOrderId, defaultName }: { open: boolean; onOpenChange: (open: boolean) => void; changeOrderId: string; defaultName: string }) {
  const [saving, setSaving] = useState(false);
  async function submit(formData: FormData) {
    setSaving(true);
    const result = await saveTemplateFromOfferAction({}, formData);
    setSaving(false);
    if (result.error) return void toast.error(result.error);
    toast.success("Шаблонът е запазен. Ще го видиш при „Нова оферта“.");
    onOpenChange(false);
  }
  return (
    <Dialog isOpen={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Запази като шаблон</DialogTitle>
        <DialogDescription>Обхватът, редовете, ДДС и бележката към клиента стават начало за следващи оферти. Цените могат да се сменят всеки път.</DialogDescription>
      </DialogHeader>
      <form action={submit} className="flex flex-col gap-3">
        <input type="hidden" name="changeOrderId" value={changeOrderId} />
        <label className="text-sm font-medium">Име на шаблона
          <Input name="name" required minLength={2} maxLength={120} defaultValue={defaultName} autoFocus className="mt-1.5 h-11 text-base sm:text-sm" />
        </label>
        <Button type="submit" isDisabled={saving} className="h-11">{saving ? "Запазване…" : "Запази шаблона"}</Button>
      </form>
    </Dialog>
  );
}
