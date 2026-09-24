"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { BookmarkPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

import { StagedAttachments, useUploadStagedFiles } from "@/components/change-orders/staged-attachments";
import { Stepper } from "@/components/change-orders/stepper";
import { VatRateField } from "@/components/change-orders/vat-rate-field";
import { DiscountField } from "@/components/change-orders/discount-field";
import { discountLabel, priceOffer, type DiscountType } from "@/modules/change-orders/pricing";
import { CatalogPicker, type CatalogPick } from "@/components/catalog/catalog-picker";
import { saveCatalogItemAction } from "@/modules/catalog/actions";
import { vatLabel } from "@/modules/change-orders/labels";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ProjectCombobox,
  type ProjectOption,
} from "@/components/workspace/project-combobox";
import {
  createOfferAction,
  type QuickChangeState,
} from "@/modules/change-orders/actions";

type Line = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

// The first row is rendered on the server too, so its key (used in input names) must be stable.
function blankLine(key: string = crypto.randomUUID()): Line {
  return {
    key,
    description: "",
    quantity: "1",
    unit: "бр.",
    unitPrice: "",
  };
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export type OfferFormInitial = {
  /** Where the prefill came from, shown above the form (a template name or the duplicated offer). */
  source: string;
  title: string;
  description: string;
  taxRate: string;
  lines: Array<{ description: string; quantity: number; unit: string; unitPrice: number }>;
};

export function OfferForm({
  defaultProject,
  defaultTaxRate,
  catalog = [],
  canSaveCatalog = false,
  initial,
}: {
  defaultProject?: ProjectOption | null;
  defaultTaxRate: string;
  catalog?: CatalogPick[];
  canSaveCatalog?: boolean;
  initial?: OfferFormInitial | null;
}) {
  const [state, action, pending] = useActionState<QuickChangeState, FormData>(
    createOfferAction,
    {},
  );
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [project, setProject] = useState<ProjectOption | null>(
    defaultProject ?? null,
  );
  const projectId = project?.id ?? "";
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [lines, setLines] = useState<Line[]>(() => initial?.lines.length
    ? initial.lines.map((line, index) => ({ key: `line-${index + 1}`, description: line.description, quantity: String(line.quantity), unit: line.unit, unitPrice: String(line.unitPrice) }))
    : [blankLine("line-1")]);
  const [deadline, setDeadline] = useState("");
  const [localError, setLocalError] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const uploadProgress = useUploadStagedFiles(state.createdId, files, "offer-created");

  const [taxRateValue, setTaxRateValue] = useState(String(Number(initial?.taxRate ?? defaultTaxRate)));

  /** A catalog pick fills the first empty line, otherwise it is appended. */
  function addFromCatalog(item: CatalogPick) {
    const line = { description: item.name, quantity: "1", unit: item.unit ?? "", unitPrice: String(Number(item.unitPrice)) };
    setLines((current) => {
      const empty = current.findIndex((row) => !row.description.trim() && !Number(row.unitPrice));
      if (empty === -1) return [...current, { ...blankLine(), ...line }];
      return current.map((row, index) => index === empty ? { ...row, ...line, key: crypto.randomUUID() } : row);
    });
  }
  const taxRate = Number(taxRateValue);
  const [discountType, setDiscountType] = useState<"" | DiscountType>("");
  const [discountValue, setDiscountValue] = useState("");
  const projectName = project?.name ?? "";

  const priced = useMemo(
    () =>
      lines.map((line) => {
        const quantity = Number(line.quantity || 0);
        const unitPrice = Number(line.unitPrice || 0);
        return {
          ...line,
          quantity,
          unitPrice,
          lineTotal: money(quantity * unitPrice),
        };
      }),
    [lines],
  );

  const totals = useMemo(() => {
    const price = priceOffer(priced, taxRate, discountType ? { type: discountType, value: Number(discountValue) } : null);
    return { gross: price.gross, discount: price.discountAmount, subtotal: price.subtotal, tax: price.taxAmount, total: price.total };
  }, [priced, taxRate, discountType, discountValue]);

  const payload = priced
    .filter((line) => line.description.trim())
    .map((line) => ({
      description: line.description.trim(),
      quantity: line.quantity,
      unit: line.unit.trim(),
      unitPrice: line.unitPrice,
    }));

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function openPreview() {
    if (!projectId) return setLocalError("Избери обект.");
    if (title.trim().length < 3) return setLocalError("Добави кратко заглавие.");
    if (description.trim().length < 5) return setLocalError("Опиши работата.");
    if (!deadline) return setLocalError("Посочи договорен краен срок.");
    if (!payload.length) return setLocalError("Добави поне един ред.");
    if (payload.some((line) => line.description.length < 2)) {
      return setLocalError("Опиши всеки ред.");
    }
    if (payload.some((line) => line.quantity <= 0)) {
      return setLocalError("Количеството трябва да е поне 1.");
    }
    setLocalError("");
    setStep("preview");
  }

  const error = localError || state.error;
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div>
      {initial ? <p className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">Попълнено от <span className="font-semibold">{initial.source}</span>. Провери обекта, цените и срока, преди да продължиш.</p> : null}
      <ol className="mb-4 flex items-center gap-2 text-sm">
        <li className={step === "edit" ? "font-semibold" : "text-muted-foreground"}>
          1. Оферта
        </li>
        <li aria-hidden className="h-px w-8 bg-border" />
        <li
          className={
            step === "preview" ? "font-semibold" : "text-muted-foreground"
          }
        >
          2. Преглед
        </li>
      </ol>

      {step === "edit" ? (
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-5">
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="block text-sm">
                <label htmlFor="projectId" className="mb-1.5 block font-medium">
                  Обект
                </label>
                <ProjectCombobox
                  id="projectId"
                  defaultValue={project}
                  placeholder="Избери обект"
                  isRequired
                  inputClassName="h-10"
                  onChange={setProject}
                />
              </div>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Заглавие</span>
                <Input
                  value={title}
                  required
                  placeholder="Какво предлагаш"
                  className="h-10"
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="mb-1.5 block font-medium">Обхват</span>
              <Textarea
                value={description}
                required
                placeholder="Какво включва работата и какво остава извън нея."
                className="min-h-20"
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </section>

          <section className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <p className="text-sm font-semibold">Редове</p>
              <div className="flex gap-2">
              <CatalogPicker items={catalog} onPick={addFromCatalog} />
              <Button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
                onPress={() => setLines((current) => [...current, blankLine()])}
              >
                <Plus className="size-4" /> Ред
              </Button>
              </div>
            </div>
            <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_9.5rem_5.5rem_4.75rem] gap-2 px-4 py-2 text-xs text-muted-foreground xl:grid">
              <span>Описание</span>
              <span>К-во</span>
              <span>Мярка</span>
              <span className="text-right">Ед. цена</span>
              <span className="text-right">Сума</span>
              <span />
            </div>
            <div className="divide-y">
              {lines.map((line, index) => {
                const row = priced[index];
                return (
                  <div
                    key={line.key}
                    className="px-4 py-3 xl:grid xl:grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_9.5rem_5.5rem_4.75rem] xl:items-center xl:gap-2"
                  >
                    <div className="flex gap-2 xl:contents">
                      <Input
                        value={line.description}
                        placeholder="Какво включва редът"
                        aria-label={`Описание ${index + 1}`}
                        className="h-10 min-w-0 flex-1"
                        onChange={(event) =>
                          updateLine(line.key, {
                            description: event.target.value,
                          })
                        }
                      />
                      <Button
                        type="button"
                        aria-label="Премахни ред"
                        isDisabled={lines.length === 1}
                        className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 xl:hidden"
                        onPress={() =>
                          setLines((current) =>
                            current.filter((item) => item.key !== line.key),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-[6.5rem_minmax(3.5rem,4.5rem)_minmax(0,1fr)] items-center gap-2 xl:contents">
                      <Stepper
                        name={`quantity-${line.key}`}
                        label={`Количество ${index + 1}`}
                        defaultValue={line.quantity}
                        min={1}
                        max={999999}
                        step={1}
                        compact
                        onValueChange={(quantity) =>
                          updateLine(line.key, { quantity })
                        }
                      />
                      <Input
                        value={line.unit}
                        placeholder="бр."
                        aria-label={`Мярка ${index + 1}`}
                        className="h-10"
                        onChange={(event) =>
                          updateLine(line.key, { unit: event.target.value })
                        }
                      />
                      <label className="flex h-10 items-center rounded-lg border bg-background px-2">
                        <span className="sr-only">Единична цена {index + 1}</span>
                        <Input
                          value={line.unitPrice}
                          inputMode="decimal"
                          placeholder="0"
                          aria-label={`Единична цена ${index + 1}`}
                          className="h-8 w-full min-w-[6ch] border-0 bg-transparent text-right text-sm tabular-nums focus-visible:ring-0"
                          onChange={(event) =>
                            updateLine(line.key, {
                              unitPrice: event.target.value,
                            })
                          }
                        />
                        <span className="shrink-0 pl-2 text-xs text-muted-foreground">
                          EUR
                        </span>
                      </label>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 xl:mt-0 xl:justify-end">
                      {canSaveCatalog ? <SaveLineButton line={line} className="xl:hidden" /> : <span />}
                      <p className="text-right text-sm font-medium tabular-nums">
                        {formatMoney(row?.lineTotal ?? 0)}
                      </p>
                    </div>
                    <div className="hidden items-center justify-end gap-0.5 xl:flex">
                      {canSaveCatalog ? <SaveLineButton line={line} iconOnly /> : null}
                      <Button
                        type="button"
                        aria-label="Премахни ред"
                        isDisabled={lines.length === 1}
                        className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                        onPress={() =>
                          setLines((current) =>
                            current.filter((item) => item.key !== line.key),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border bg-card p-4">
            <VatRateField value={taxRateValue} onChange={setTaxRateValue} />
            <DiscountField defaultType={discountType} defaultValue={discountValue} onChange={(type, value) => { setDiscountType(type); setDiscountValue(value); }} />
          </section>

          <label className="block rounded-2xl border bg-card p-4 text-sm font-medium">Договорен краен срок
            <div className="mt-2"><DatePicker aria-label="Договорен краен срок" required value={deadline} onChange={setDeadline} /></div>
          </label>

          <StagedAttachments files={files} onChange={setFiles} />
        </div>

        <aside className="mt-4 rounded-2xl border bg-card p-4 lg:sticky lg:top-20 lg:mt-0">
          <p className="text-sm font-semibold">Сметка</p>
          <dl className="mt-3 space-y-2 text-sm">
            {totals.discount ? <>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Сума по редове</dt>
                <dd className="tabular-nums">{formatMoney(totals.gross)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-primary">
                <dt>{discountLabel(discountType || null, discountValue)}</dt>
                <dd className="tabular-nums">−{formatMoney(totals.discount)}</dd>
              </div>
            </> : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Без ДДС</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{vatLabel(taxRate)}</dt>
              <dd className="tabular-nums">{formatMoney(totals.tax)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t pt-2 text-base font-semibold">
              <dt>Общо</dt>
              <dd className="tabular-nums">{formatMoney(totals.total)} EUR</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {deadline ? `Срок до ${deadline}` : "Посочи договорен краен срок"}
          </p>
        </aside>
      </div>
      ) : null}

      {step === "preview" ? (
        <form action={action}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="description" value={description} />
        <input type="hidden" name="lines" value={JSON.stringify(payload)} />
        <input type="hidden" name="taxRate" value={taxRateValue} />
        <input type="hidden" name="discountType" value={discountType} />
        <input type="hidden" name="discountValue" value={discountType ? discountValue : ""} />
        <input type="hidden" name="scheduleImpactType" value="none" />
        <input type="hidden" name="agreedDeadline" value={deadline} />
        {files.length ? <input type="hidden" name="hasAttachments" value="1" /> : null}
        <section className="rounded-2xl border bg-card">
          <div className="border-b px-4 py-3 sm:px-6">
            <p className="text-xs font-medium text-primary">{projectName}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="divide-y">
            {priced
              .filter((line) => line.description.trim())
              .map((line) => (
                <div
                  key={line.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 sm:px-6"
                >
                  <div>
                    <p className="font-medium">{line.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {line.quantity} {line.unit} × {formatMoney(line.unitPrice)} EUR
                    </p>
                  </div>
                  <p className="font-medium tabular-nums">
                    {formatMoney(line.lineTotal)} EUR
                  </p>
                </div>
              ))}
          </div>
          <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2 sm:px-6">
            <p className="text-sm">
              <span className="text-muted-foreground">Срок · </span>
              До {deadline}
            </p>
            <div className="text-sm sm:text-right">
              <p className="text-muted-foreground">
                {totals.discount ? `${discountLabel(discountType || null, discountValue)} −${formatMoney(totals.discount)} · ` : ""}{taxRate ? `Без ДДС ${formatMoney(totals.subtotal)} · ${vatLabel(taxRate)}` : "Не се начислява ДДС"}
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoney(totals.total)} EUR
              </p>
            </div>
          </div>
          {files.length ? (
            <p className="border-t px-4 py-3 text-sm sm:px-6">
              {files.length === 1 ? "1 файл ще бъде прикачен" : `${files.length} файла ще бъдат прикачени`} към черновата.
            </p>
          ) : null}
          <p className="border-t px-4 py-3 text-sm text-muted-foreground sm:px-6">
            Чернова. Клиентът още не я вижда, докато не я изпратиш.
          </p>
        </section>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="sticky bottom-20 z-20 mt-4 flex gap-2 border-t bg-background/95 py-3 backdrop-blur lg:bottom-0">
          <Button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium"
            onPress={() => setStep("edit")}
          >
            <Pencil className="size-4" /> Редакция
          </Button>
          <Button
            type="submit"
            isDisabled={pending || !!state.createdId}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {uploadProgress ? `Качване на файлове ${uploadProgress.done + 1}/${uploadProgress.total}…` : pending || state.createdId ? "Запазване…" : "Създай черновата"}
          </Button>
        </div>
        </form>
      ) : (
        <>
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="sticky bottom-20 z-20 mt-4 border-t bg-background/95 py-3 backdrop-blur lg:bottom-0">
            <Button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
              onPress={openPreview}
            >
              Преглед
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/** Saves one line (name, unit, price) to the company catalog for next time. */
function SaveLineButton({ line, iconOnly = false, className }: { line: Line; iconOnly?: boolean; className?: string }) {
  const [saving, setSaving] = useState(false);
  async function save() {
    if (line.description.trim().length < 2) return toast.error("Първо опиши реда.");
    setSaving(true);
    const formData = new FormData();
    formData.set("name", line.description.trim());
    formData.set("unit", line.unit.trim());
    formData.set("unitPrice", line.unitPrice || "0");
    const result = await saveCatalogItemAction({}, formData);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success(`„${line.description.trim()}“ е в каталога`);
  }
  return iconOnly ? (
    <Button type="button" aria-label="Запази в каталога" isDisabled={saving} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" onPress={save}>
      <BookmarkPlus className="size-4" />
    </Button>
  ) : (
    <Button type="button" variant="ghost" isDisabled={saving} className={`h-9 gap-1.5 px-2 text-xs text-muted-foreground ${className ?? ""}`} onPress={save}>
      <BookmarkPlus className="size-4" /> В каталога
    </Button>
  );
}
