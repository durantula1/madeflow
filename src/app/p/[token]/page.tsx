import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { ReviewActions } from "@/components/portal/review-actions";
import { formatDate } from "@/lib/presentation/orders";
import { formatMoneyFromMinor } from "@/lib/money";
import { getPublicEnvironment } from "@/lib/env/public";
import {
  getPortalReview,
  getPortalVersionFiles,
} from "@/modules/portal/queries";

type Snapshot = {
  values?: Record<string, unknown>;
  template?: {
    fields?: Array<{
      stableKey: string;
      sectionKey: string;
      sectionLabel: string;
      label: string;
      unit?: string | null;
    }>;
  };
};
export default async function PortalReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const review = await getPortalReview(token);
  if (!review) notFound();
  const portalFiles = await getPortalVersionFiles(
    review.organizationId,
    review.versionId,
  );
  const snapshot = review.snapshot as Snapshot;
  const fields = snapshot.template?.fields ?? [];
  const sections = Array.from(
    new Map(fields.map((f) => [f.sectionKey, f.sectionLabel])).entries(),
  );
  const commercial = review.commercial as {
    totalMinor?: string;
    depositRequiredMinor?: string;
    currency?: string;
    items?: Array<{
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
    }>;
  };
  const isAwaitingDecision = review.versionStatus === "awaiting_approval";
  const isApproved = review.versionStatus === "approved";
  return (
    <main className="min-h-screen px-5 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">{review.organizationName}</p>
            <p className="text-sm text-muted-foreground">
              Предложение чрез MadeFlow
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${isApproved ? "bg-emerald-100 text-emerald-800" : isAwaitingDecision ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}
          >
            {isApproved ? (
              <CheckCircle2 className="size-3.5" />
            ) : isAwaitingDecision ? (
              <FileCheck2 className="size-3.5" />
            ) : (
              <Clock3 className="size-3.5" />
            )}
            {isApproved
              ? "Одобрена"
              : isAwaitingDecision
                ? "За преглед"
                : "Обработва се"}
          </span>
        </header>
        <section className="mt-8 rounded-[1.75rem] bg-[#24261f] p-6 text-stone-50 sm:p-8">
          <p className="font-mono text-xs text-[#8ac99a]">
            {review.orderNumber} · версия {review.versionNumber}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {review.orderTitle}
          </h1>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-stone-300">
            <span>Клиент: {review.customerName}</span>
            <span>Публикувана: {formatDate(review.publishedAt)}</span>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-stone-400">
            <ShieldCheck className="size-4" />
            Отпечатък: <code className="truncate">{review.contentHash}</code>
          </div>
        </section>
        <div className="mt-6 space-y-5">
          {sections.map(([key, label]) => (
            <section
              key={key}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <h2 className="font-semibold">{label}</h2>
              <dl className="mt-4 divide-y">
                {fields
                  .filter((f) => f.sectionKey === key)
                  .map((field) => {
                    const value = snapshot.values?.[field.stableKey];
                    if (value === undefined || value === "" || value === false)
                      return null;
                    return (
                      <div
                        key={field.stableKey}
                        className="grid gap-1 py-3 sm:grid-cols-[240px_1fr]"
                      >
                        <dt className="text-sm text-muted-foreground">
                          {field.label}
                        </dt>
                        <dd className="text-sm font-medium">
                          {value === true ? "Да" : String(value)}{" "}
                          {field.unit ?? ""}
                        </dd>
                      </div>
                    );
                  })}
              </dl>
            </section>
          ))}
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Оферта</h2>
            {commercial.items?.length ? (
              <div className="mt-4 divide-y">
                {commercial.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-1 py-3 text-sm sm:grid-cols-[1fr_120px_150px]"
                  >
                    <span>{item.description}</span>
                    <span className="text-muted-foreground">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="font-medium sm:text-right">
                      {item.unitPrice} {commercial.currency ?? review.currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Няма отделни позиции.
              </p>
            )}
            <div className="mt-4 flex justify-between rounded-xl bg-muted p-4">
              <span className="font-medium">Обща стойност</span>
              <strong>
                {formatMoneyFromMinor(
                  BigInt(commercial.totalMinor ?? 0),
                  commercial.currency ?? review.currency,
                )}
              </strong>
            </div>
          </section>
          {portalFiles.length > 0 && (
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">Файлове към версията</h2>
              <div className="mt-4 divide-y">
                {portalFiles.map((file) => (
                  <a
                    key={file.id}
                    href={`${getPublicEnvironment().NEXT_PUBLIC_SUPABASE_URL}/functions/v1/portal-file?token=${encodeURIComponent(token)}&file=${file.id}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <FileText className="size-4 text-primary" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <Download className="size-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </section>
          )}
          {isAwaitingDecision ? (
            <ReviewActions
              token={token}
              customerName={review.customerName}
              customerEmail={review.customerEmail}
            />
          ) : (
            <section
              className={`rounded-2xl border p-5 shadow-sm ${isApproved ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`}
            >
              <div className="flex gap-3">
                {isApproved ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700" />
                ) : (
                  <Clock3 className="mt-0.5 size-5 shrink-0 text-blue-700" />
                )}
                <div>
                  <h2 className="font-semibold">
                    {isApproved
                      ? "Тази версия е одобрена"
                      : "Обратната връзка е получена"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isApproved
                      ? "Тук ще се появи следващата версия, ако фирмата изпрати нова за преглед. Не е необходим нов линк."
                      : "Екипът подготвя следващата версия. Тя ще се появи автоматично на същия линк, когато е готова."}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          <CheckCircle2 className="mr-1 inline size-3" />
          {isAwaitingDecision
            ? "Виждаш точно версията, която ще бъде записана при одобрение."
            : "Този клиентски линк остава същият за следващите версии."}
        </p>
      </div>
    </main>
  );
}
