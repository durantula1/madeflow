import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import type { OfferScope } from "@/modules/projects/scope";
import { cents, formatCents, type OfferState } from "@/modules/projects/state";

/**
 * "Всички · ОФ-001 · ОФ-002 · Без оферта": one row of chips that filters a tab by offer. It shows only
 * when there is something to choose, so a project with one offer looks as it always did.
 */
export function OfferScopeChips({ offers, scope, hasUnassigned, hrefFor, className }: {
  offers: Pick<OfferState, "id" | "sequenceNumber" | "title">[];
  scope: OfferScope;
  hasUnassigned: boolean;
  hrefFor: (scope: OfferScope) => string;
  className?: string;
}) {
  // Nothing to choose with no offer, or with one offer and nothing outside it.
  if (!offers.length || (offers.length === 1 && !hasUnassigned)) return null;
  const chips = [
    { scope: "all", label: "Всички" },
    ...offers.map((offer) => ({ scope: offer.id, label: documentCode("offer", offer.sequenceNumber), title: offer.title })),
    ...(hasUnassigned ? [{ scope: "none", label: "Без оферта" }] : []),
  ];
  return (
    <nav aria-label="Филтър по оферта" className={cn("-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1", className)}>
      {chips.map((chip) => {
        const active = chip.scope === scope;
        return (
          <Link
            key={chip.scope}
            href={hrefFor(chip.scope)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            title={"title" in chip ? chip.title : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition",
              active ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {chip.label}
            {"title" in chip ? <span className={cn("hidden max-w-40 truncate font-normal sm:inline", active ? "text-background/70" : "text-muted-foreground/80")}>{chip.title}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** A thin bar in the brand green with what it measures written next to it ("40% платено"), so it is never a bare line. */
export function Meter({ percent, caption, label, className }: { percent: number; caption: string; label: string; className?: string }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-brand-green" style={{ width: `${width}%` }} />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{caption}</span>
    </div>
  );
}

/** Paid against agreed. Overpaid fills the bar and says "изплатено". */
export function PaidBar({ paidMinor, contractMinor, className }: { paidMinor: bigint; contractMinor: bigint; className?: string }) {
  const percent = contractMinor > 0n ? Math.max(0, Number((paidMinor * 100n) / contractMinor)) : 0;
  return <Meter className={className} percent={percent} label="Платено от договореното" caption={percent >= 100 ? "изплатено" : `${percent}% платено`} />;
}

/**
 * One agreement at a glance: code and title, its status, paid against agreed and what comes next.
 * The whole card links to the offer.
 */
export function OfferCard({ offer, href, className }: { offer: OfferState; href: string; className?: string }) {
  const next = offer.milestones.find((item) => item.status !== "completed");
  const done = offer.milestones.filter((item) => item.status === "completed").length;
  return (
    <Link href={href} className={cn("group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground">{documentCode("offer", offer.sequenceNumber)} · версия {offer.revisionNumber}</p>
          <p className="mt-0.5 truncate font-semibold">{offer.title}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <Badge variant={offerStatusTones[offer.status]}>{offerStatusLabels[offer.status]}</Badge>
          <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
      {offer.inForce ? (
        <>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Платено <span className="font-medium text-foreground tabular-nums">{formatCents(offer.paidMinor, offer.currency)}</span></span>
            <span className="text-muted-foreground">от <span className="font-medium text-foreground tabular-nums">{formatCents(offer.contractMinor, offer.currency)}</span></span>
          </div>
          <PaidBar paidMinor={offer.paidMinor} contractMinor={offer.contractMinor} />
          <p className="text-xs text-muted-foreground">
            {offer.milestones.length ? `${done} от ${offer.milestones.length} етапа` : "Още няма етапи"}
            {next ? ` · следващ „${next.title}“ до ${formatDay(next.dueOn)}` : offer.deadline ? ` · срок ${formatDay(offer.deadline)}` : ""}
            {offer.pendingRevision ? ` · предложена версия ${offer.pendingRevision.revisionNumber}` : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground tabular-nums">{formatCents(cents(offer.total), offer.currency)}</p>
      )}
    </Link>
  );
}
