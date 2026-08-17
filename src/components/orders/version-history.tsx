"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SnapshotField = {
  stableKey: string;
  sectionKey: string;
  sectionLabel: string;
  label: string;
  unit?: string | null;
};

type VersionHistoryItem = {
  id: string;
  versionNumber: number;
  status: string;
  publishedAt: string;
  approvedAt: string | null;
  contentHash: string;
  snapshot: {
    values?: Record<string, unknown>;
    template?: { fields?: SnapshotField[] };
  };
  commercial: {
    currency?: string;
    totalMinor?: string;
    depositRequiredMinor?: string;
    notes?: string;
    items?: Array<{
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
    }>;
  };
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    category: string;
  }>;
  reviews: Array<{
    id: string;
    state: string;
    message: string;
    customerName: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  approval: {
    approverName: string;
    approverEmail: string | null;
    approvedAt: string;
    contentHash: string;
  } | null;
};

const statusLabels: Record<string, string> = {
  approved: "Одобрена",
  awaiting_approval: "Чака одобрение",
  superseded: "Заменена",
  published: "Публикувана",
};

function displayValue(value: unknown) {
  if (value === true) return "Да";
  if (value === false) return "Не";
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value ?? "—");
}

function formatMoney(minor: string | undefined, currency: string) {
  const amount = Number(minor ?? "0") / 100;
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency,
  }).format(amount);
}

function setVersionInUrl(versionId: string | null) {
  const url = new URL(window.location.href);
  if (versionId) url.searchParams.set("version", versionId);
  else url.searchParams.delete("version");
  window.history.replaceState(window.history.state, "", url);
}

export function VersionHistory({
  versions,
  currency,
  orderId,
  initialVersionId,
}: {
  versions: VersionHistoryItem[];
  currency: string;
  orderId: string;
  initialVersionId?: string;
}) {
  const [selectedId, setSelectedId] = useState(() =>
    versions.some((version) => version.id === initialVersionId)
      ? (initialVersionId ?? null)
      : null,
  );
  const selected =
    versions.find((version) => version.id === selectedId) ?? null;

  function selectVersion(versionId: string | null) {
    setSelectedId(versionId);
    setVersionInUrl(versionId);
  }

  return (
    <>
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Версии</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Отвори версия, за да видиш точния ѝ архив.
        </p>
        <div className="mt-4 space-y-3">
          {versions.length ? (
            versions.map((version) => (
              <button
                type="button"
                key={version.id}
                onClick={() => selectVersion(version.id)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-semibold">
                  v{version.versionNumber}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {statusLabels[version.status] ?? version.status}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {version.publishedAt}
                  </span>
                </span>
                {version.reviews.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquareText className="size-3.5" />
                    {version.reviews.length}
                  </span>
                )}
                {version.status === "approved" && (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Няма публикувани версии.
            </p>
          )}
        </div>
      </section>

      <Dialog
        isOpen={Boolean(selected)}
        onOpenChange={(isOpen) => {
          if (!isOpen) selectVersion(null);
        }}
        className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-0 sm:max-w-4xl"
      >
        {selected && (
          <div>
            <DialogHeader className="sticky top-0 z-10 border-b bg-popover/95 px-6 py-5 backdrop-blur">
              <div className="flex flex-wrap items-center gap-3 pr-10">
                <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
                  v{selected.versionNumber}
                </span>
                <DialogTitle className="text-xl">
                  {statusLabels[selected.status] ?? selected.status}
                </DialogTitle>
              </div>
              <DialogDescription>
                Публикувана на {selected.publishedAt}. Това е неизменимият архив
                на версията.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Обща стойност</p>
                  <p className="mt-1 font-semibold">
                    {formatMoney(
                      selected.commercial.totalMinor,
                      selected.commercial.currency ?? currency,
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Аванс</p>
                  <p className="mt-1 font-semibold">
                    {formatMoney(
                      selected.commercial.depositRequiredMinor,
                      selected.commercial.currency ?? currency,
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-muted p-4">
                  <p className="text-xs text-muted-foreground">Файлове</p>
                  <p className="mt-1 font-semibold">{selected.files.length}</p>
                </div>
              </div>

              {(selected.snapshot.template?.fields?.length ?? 0) > 0 && (
                <section>
                  <h3 className="font-semibold">Спецификация</h3>
                  <div className="mt-3 space-y-4">
                    {Array.from(
                      new Map(
                        (selected.snapshot.template?.fields ?? []).map(
                          (field) => [field.sectionKey, field.sectionLabel],
                        ),
                      ).entries(),
                    ).map(([sectionKey, sectionLabel]) => (
                      <div key={sectionKey} className="rounded-xl border p-4">
                        <h4 className="text-sm font-semibold">
                          {sectionLabel}
                        </h4>
                        <dl className="mt-2 divide-y">
                          {(selected.snapshot.template?.fields ?? [])
                            .filter((field) => field.sectionKey === sectionKey)
                            .map((field) => {
                              const value =
                                selected.snapshot.values?.[field.stableKey];
                              if (value === undefined || value === "")
                                return null;
                              return (
                                <div
                                  key={field.stableKey}
                                  className="grid gap-1 py-2.5 sm:grid-cols-[220px_1fr]"
                                >
                                  <dt className="text-sm text-muted-foreground">
                                    {field.label}
                                  </dt>
                                  <dd className="text-sm font-medium">
                                    {displayValue(value)} {field.unit ?? ""}
                                  </dd>
                                </div>
                              );
                            })}
                        </dl>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="font-semibold">Оферта</h3>
                {selected.commercial.items?.length ? (
                  <div className="mt-3 overflow-hidden rounded-xl border">
                    {selected.commercial.items.map((item, index) => (
                      <div
                        key={`${item.description}-${index}`}
                        className="grid gap-1 border-b p-3 text-sm last:border-b-0 sm:grid-cols-[1fr_120px_150px]"
                      >
                        <span className="font-medium">{item.description}</span>
                        <span className="text-muted-foreground">
                          {item.quantity} {item.unit}
                        </span>
                        <span className="sm:text-right">
                          {item.unitPrice}{" "}
                          {selected.commercial.currency ?? currency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Няма отделни позиции.
                  </p>
                )}
                {selected.commercial.notes && (
                  <p className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-4 text-sm">
                    {selected.commercial.notes}
                  </p>
                )}
              </section>

              {selected.files.length > 0 && (
                <section>
                  <h3 className="font-semibold">Файлове към версията</h3>
                  <div className="mt-3 divide-y rounded-xl border px-4">
                    {selected.files.map((file) => (
                      <a
                        key={file.id}
                        href={`/api/files/${file.id}`}
                        className="flex items-center gap-3 py-3 hover:text-primary"
                      >
                        <FileText className="size-4" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {file.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                        </span>
                        <Download className="size-4" />
                      </a>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="font-semibold">Клиентска обратна връзка</h3>
                {selected.reviews.length ? (
                  <div className="mt-3 space-y-3">
                    {selected.reviews.map((review) => (
                      <article
                        key={review.id}
                        className="rounded-xl border p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`rounded-full px-2 py-1 font-semibold ${review.state === "changes_requested" ? "bg-red-100 text-red-700" : "bg-sky-100 text-sky-700"}`}
                          >
                            {review.state === "changes_requested"
                              ? "Искани промени"
                              : "Коментар"}
                          </span>
                          <span className="text-muted-foreground">
                            {review.createdAt}
                          </span>
                          {review.resolvedAt && (
                            <span className="font-medium text-emerald-700">
                              Изпълнено
                            </span>
                          )}
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm">
                          {review.message}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          От {review.customerName ?? "клиента"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Няма обратна връзка по тази версия.
                  </p>
                )}
              </section>

              {selected.approval && (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                    <div>
                      <h3 className="font-semibold text-emerald-900">
                        Одобрена от {selected.approval.approverName}
                      </h3>
                      <p className="mt-1 text-sm text-emerald-800">
                        {selected.approval.approvedAt}
                        {selected.approval.approverEmail
                          ? ` · ${selected.approval.approverEmail}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 shrink-0" />
                  <code className="truncate">{selected.contentHash}</code>
                </span>
                <a
                  href={`/api/orders/${orderId}/pdf?version=${selected.id}`}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold"
                >
                  <Download className="size-4" />
                  PDF на версията
                </a>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
