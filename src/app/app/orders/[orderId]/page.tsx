import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  MapPin,
  MessageSquareWarning,
  RotateCcw,
  Send,
  Square,
} from "lucide-react";
import { CopyLink } from "@/components/orders/copy-link";
import { FileUploader } from "@/components/orders/file-uploader";
import { OperationsPanel } from "@/components/orders/operations-panel";
import { SpecificationEditor } from "@/components/orders/specification-editor";
import { VersionHistory } from "@/components/orders/version-history";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { hashPortalToken } from "@/lib/crypto/portal-token";
import { getPublicEnvironment } from "@/lib/env/public";
import {
  formatDate,
  orderStageClasses,
  orderStageLabels,
} from "@/lib/presentation/orders";
import { getOrderPassport } from "@/modules/orders/queries";
import { setReviewResolutionAction } from "@/modules/orders/actions";
import {
  createApprovalLinkAction,
  publishVersionAction,
  rotateApprovalLinkAction,
} from "@/modules/versions/actions";

type TemplateField = {
  stableKey: string;
  sectionKey: string;
  sectionLabel: string;
  label: string;
  fieldType: string;
  unit?: string | null;
  required: boolean;
  optionsJson?: string[] | null;
};
export default async function OrderPassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{
    share?: string;
    published?: string;
    version?: string;
  }>;
}) {
  const [{ orderId }, query, context] = await Promise.all([
    params,
    searchParams,
    requireTenantContext(),
  ]);
  const passport = await getOrderPassport({
    organizationId: context.organizationId,
    orderId,
  });
  if (!passport) notFound();
  const {
    order,
    draft,
    versions,
    files,
    activity,
    payments,
    installation,
    warranties,
    services,
    reviews,
    approvals,
    versionFiles,
    clientLink,
  } = passport;
  const template = (draft?.templateSnapshotJson ?? {}) as {
    fields?: TemplateField[];
  };
  const commercial = (draft?.commercialJson ?? {}) as {
    currency?: string;
    totalMinor?: string;
    depositRequiredMinor?: string;
    notes?: string;
    items?: Array<{
      id: string;
      description: string;
      quantity: string;
      unit: string;
      unitPrice: string;
    }>;
  };
  const reusableToken =
    clientLink && clientLink.tokenHash === hashPortalToken(clientLink.id)
      ? clientLink.id
      : null;
  const shareToken = query.share ?? reusableToken;
  const shareUrl = shareToken
    ? `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/p/${shareToken}`
    : null;
  const latest = versions[0];
  const openReviewsCount = reviews.filter(
    (review) =>
      review.state === "changes_requested" && review.resolvedAt === null,
  ).length;
  const linkedVersion = versions.find(
    (version) => version.id === clientLink?.versionId,
  );
  const shouldShowLinkAction =
    latest && (!reusableToken || linkedVersion?.id !== latest.id);
  const versionHistory = versions.map((version) => ({
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    publishedAt: formatDate(version.publishedAt),
    approvedAt: version.approvedAt ? formatDate(version.approvedAt) : null,
    contentHash: version.contentHash,
    snapshot: version.snapshotJson as {
      values?: Record<string, unknown>;
      template?: { fields?: TemplateField[] };
    },
    commercial: version.commercialSnapshotJson as {
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
    },
    files: versionFiles.filter((file) => file.versionId === version.id),
    reviews: reviews
      .filter((review) => review.versionId === version.id)
      .map((review) => ({
        id: review.id,
        state: review.state,
        message: review.message,
        customerName: review.customerName,
        createdAt: formatDate(review.createdAt),
        resolvedAt: review.resolvedAt ? formatDate(review.resolvedAt) : null,
      })),
    approval:
      approvals
        .filter((approval) => approval.versionId === version.id)
        .map((approval) => ({
          approverName: approval.approverName,
          approverEmail: approval.approverEmail,
          approvedAt: formatDate(approval.approvedAt),
          contentHash: approval.contentHash,
        }))[0] ?? null,
  }));
  return (
    <>
      <Link href="/app/orders" className="text-sm text-muted-foreground">
        ← Поръчки
      </Link>
      <div className="mt-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs font-semibold text-primary">
              {order.orderNumber}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${orderStageClasses[order.stage]}`}
            >
              {orderStageLabels[order.stage]}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {order.title}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link
              href={`/app/customers/${order.customerId}`}
              className="font-medium text-foreground hover:underline"
            >
              {order.customerName}
            </Link>
            {order.siteAddress && (
              <span className="inline-flex gap-1.5">
                <MapPin className="size-4" />
                {order.siteAddress}
              </span>
            )}
            {order.targetDeliveryDate && (
              <span className="inline-flex gap-1.5">
                <CalendarDays className="size-4" />
                {formatDate(order.targetDeliveryDate)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {latest && (
            <a
              href={`/api/orders/${order.id}/pdf?version=${latest.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold shadow-sm"
            >
              <Download className="size-4" />
              PDF
            </a>
          )}
          {draft && (
            <form action={publishVersionAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="inline-flex h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold shadow-sm">
                <FileText className="size-4" />
                Публикувай версия
              </button>
            </form>
          )}
          {shouldShowLinkAction && (
            <form action={createApprovalLinkAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                <Send className="size-4" />
                {latest.status === "approved"
                  ? "Създай постоянен линк"
                  : `Изпрати версия v${latest.versionNumber}`}
              </button>
            </form>
          )}
        </div>
      </div>
      {query.published && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-100 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="size-4" />
          Неизменимата версия е публикувана.
        </div>
      )}
      {shareUrl && (
        <section className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Постоянна клиентска връзка</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Изпраща се само веднъж. При следваща версия същият линк ще
                покаже новата версия автоматично.
              </p>
            </div>
            {linkedVersion && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Показва v{linkedVersion.versionNumber}
              </span>
            )}
          </div>
          <div className="mt-3">
            <CopyLink url={shareUrl} />
          </div>
          <form action={rotateApprovalLinkAction} className="mt-3">
            <input type="hidden" name="orderId" value={order.id} />
            <button className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <RotateCcw className="size-3.5" />
              Смени линка по съображения за сигурност
            </button>
          </form>
        </section>
      )}
      {reviews.length > 0 && (
        <section className="mt-5 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50/70 shadow-sm dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex flex-col gap-3 border-b border-amber-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                <MessageSquareWarning className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">Обратна връзка от клиента</h2>
                <p className="text-sm text-muted-foreground">
                  Коментари и поискани промени по публикуваните версии.
                </p>
              </div>
            </div>
            {openReviewsCount > 0 && (
              <span className="w-fit rounded-full bg-amber-200 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                {openReviewsCount} {openReviewsCount === 1 ? "нова" : "нови"}
              </span>
            )}
          </div>
          <div className="divide-y divide-amber-200 dark:divide-amber-900">
            {reviews.map((review) => {
              const version = versions.find(
                (item) => item.id === review.versionId,
              );

              return (
                <article
                  key={review.id}
                  className={`px-5 py-4 ${review.resolvedAt ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        review.state === "changes_requested"
                          ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                          : "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                      }`}
                    >
                      {review.state === "changes_requested"
                        ? "Иска промени"
                        : "Коментар"}
                    </span>
                    {version && (
                      <span className="rounded-full border bg-background/70 px-2.5 py-1 text-xs font-medium">
                        Версия {version.versionNumber}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                    {review.resolvedAt && (
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Изпълнено
                      </span>
                    )}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {review.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    От {review.customerName || order.customerName}
                  </p>
                  {review.state === "changes_requested" && (
                    <form action={setReviewResolutionAction} className="mt-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input
                        type="hidden"
                        name="resolved"
                        value={review.resolvedAt ? "false" : "true"}
                      />
                      <button
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${review.resolvedAt ? "border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-50" : "bg-background hover:border-emerald-400 hover:text-emerald-700"}`}
                      >
                        {review.resolvedAt ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Square className="size-4" />
                        )}
                        {review.resolvedAt
                          ? "Изпълнено — върни задачата"
                          : "Маркирай като изпълнено"}
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
      {openReviewsCount > 0 && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Има {openReviewsCount} неизпълнени{" "}
          {openReviewsCount === 1 ? "промяна" : "промени"}. Можеш да публикуваш
          нова версия, но провери checklist-а преди да я изпратиш на клиента.
        </div>
      )}
      <div className="mt-7 grid gap-6 2xl:grid-cols-[1fr_350px]">
        <div className="min-w-0 space-y-6">
          {draft ? (
            <SpecificationEditor
              orderId={order.id}
              initialRevision={draft.revision}
              initialValues={draft.valuesJson}
              initialCommercial={commercial}
              fields={template.fields ?? []}
            />
          ) : (
            <div className="rounded-2xl border bg-card p-8 text-center">
              Липсва работна чернова.
            </div>
          )}
          <FileUploader
            organizationId={context.organizationId}
            orderId={order.id}
          />
          {files.length > 0 && (
            <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b px-5 py-4">
                <h2 className="font-semibold">Качени файлове</h2>
              </div>
              <div className="divide-y">
                {files.map((file) => (
                  <a
                    key={file.id}
                    href={`/api/files/${file.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-muted">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {file.category} ·{" "}
                        {(file.sizeBytes / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <Download className="size-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </section>
          )}
          <OperationsPanel
            orderId={order.id}
            currency={order.currency}
            stage={order.stage}
            payments={payments}
            installation={installation}
            warranties={warranties}
            services={services}
          />
        </div>
        <aside className="space-y-5">
          <VersionHistory
            versions={versionHistory}
            currency={order.currency}
            orderId={order.id}
            initialVersionId={query.version}
          />
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Хронология</h2>
            <div className="mt-4 space-y-4">
              {activity.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {event.eventType.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
