"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { Stepper } from "@/components/change-orders/stepper";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createOfferAction,
  type QuickChangeState,
} from "@/modules/change-orders/actions";

type ProjectOption = { id: string; name: string };
type Line = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

function blankLine(): Line {
  return {
    key: crypto.randomUUID(),
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

export function OfferForm({
  projects,
  defaultProjectId,
  defaultTaxRate,
}: {
  projects: ProjectOption[];
  defaultProjectId?: string;
  defaultTaxRate: string;
}) {
  const [state, action, pending] = useActionState<QuickChangeState, FormData>(
    createOfferAction,
    {},
  );
  const [step, setStep] = useState<"edit" | "preview">("edit");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [deadline, setDeadline] = useState("");
  const [localError, setLocalError] = useState("");

  const taxRate = Number(defaultTaxRate);
  const projectName =
    projects.find((project) => project.id === projectId)?.name ?? "";

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
    const subtotal = money(priced.reduce((sum, line) => sum + line.lineTotal, 0));
    const tax = money(subtotal * (taxRate / 100));
    return { subtotal, tax, total: money(subtotal + tax) };
  }, [priced, taxRate]);

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
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium">Обект</span>
                <Select
                  selectedKey={projectId || null}
                  placeholder="Избери обект"
                  isRequired
                  className="w-full"
                  onSelectionChange={(key) => setProjectId(String(key ?? ""))}
                >
                  <SelectTrigger id="projectId" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} id={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
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
              <Button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted"
                onPress={() => setLines((current) => [...current, blankLine()])}
              >
                <Plus className="size-4" /> Ред
              </Button>
            </div>
            <div className="hidden grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_9.5rem_5.5rem_2.25rem] gap-2 px-4 py-2 text-xs text-muted-foreground sm:grid">
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
                    className="px-4 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_9.5rem_5.5rem_2.25rem] sm:items-center sm:gap-2"
                  >
                    <div className="flex gap-2 sm:contents">
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
                        className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 sm:hidden"
                        onPress={() =>
                          setLines((current) =>
                            current.filter((item) => item.key !== line.key),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-[6.5rem_4.5rem_minmax(8rem,1fr)] items-center gap-2 sm:contents">
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
                    <p className="mt-1 text-right text-sm font-medium tabular-nums sm:mt-0">
                      {formatMoney(row?.lineTotal ?? 0)}
                    </p>
                    <Button
                      type="button"
                      aria-label="Премахни ред"
                      isDisabled={lines.length === 1}
                      className="hidden size-9 place-items-center justify-self-end rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 sm:grid"
                      onPress={() =>
                        setLines((current) =>
                          current.filter((item) => item.key !== line.key),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>

          <label className="block rounded-2xl border bg-card p-4 text-sm font-medium">Договорен краен срок
            <Input type="date" required value={deadline} onChange={(event) => setDeadline(event.target.value)} className="mt-2 h-10" />
          </label>
        </div>

        <aside className="mt-4 rounded-2xl border bg-card p-4 lg:sticky lg:top-20 lg:mt-0">
          <p className="text-sm font-semibold">Сметка</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Без ДДС</dt>
              <dd className="tabular-nums">{formatMoney(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ДДС {defaultTaxRate}%</dt>
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
        <input type="hidden" name="taxRate" value={defaultTaxRate} />
        <input type="hidden" name="scheduleImpactType" value="none" />
        <input type="hidden" name="agreedDeadline" value={deadline} />
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
                Без ДДС {formatMoney(totals.subtotal)} · ДДС {defaultTaxRate}%
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {formatMoney(totals.total)} EUR
              </p>
            </div>
          </div>
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
            isDisabled={pending}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Запазване…" : "Създай черновата"}
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
