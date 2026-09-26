import "server-only";

import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  changeOrderPaymentTerms,
  changeOrderRevisions,
  changeOrders,
  paymentInstallments,
  projectMilestones,
  revisionAbsorbedChanges,
  timelineEvents,
} from "@/db/schema";
import { termAmounts, termPaymentKind, type PaymentTermTrigger } from "@/modules/change-orders/payment-terms";
import { notifyProjectStaff } from "@/modules/notifications/staff";
import { cents } from "@/modules/projects/state";

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" });

function fromCents(value: bigint) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

/**
 * What an approved offer version sets in motion, inside the transaction that records the decision:
 *  - the approved changes it includes stop adding to the price;
 *  - its payment terms become the offer's installments. Installments made from an earlier version's
 *    terms are replaced while nothing was paid against them; once something was, the plan is left
 *    alone and the team is asked to adjust it by hand.
 */
export async function applyApprovedOffer(tx: Transaction, input: { organizationId: string; projectId: string; offerId: string; revisionId: number; approvedAt: Date }) {
  const [revision] = await tx.select({ total: changeOrderRevisions.total, currency: changeOrderRevisions.currency, deadline: changeOrderRevisions.agreedDeadline, revisionNumber: changeOrderRevisions.revisionNumber, createdBy: changeOrderRevisions.createdBy })
    .from(changeOrderRevisions).where(eq(changeOrderRevisions.id, input.revisionId)).limit(1);
  if (!revision) return;

  const absorbed = await tx.select({ changeOrderId: revisionAbsorbedChanges.changeOrderId }).from(revisionAbsorbedChanges)
    .where(eq(revisionAbsorbedChanges.revisionId, input.revisionId));
  if (absorbed.length) {
    await tx.update(changeOrders).set({ absorbedByRevisionId: input.revisionId, updatedAt: new Date() })
      .where(and(
        inArray(changeOrders.id, absorbed.map((row) => row.changeOrderId)),
        eq(changeOrders.baselineOfferId, input.offerId),
        isNotNull(changeOrders.approvedRevisionId),
        isNull(changeOrders.absorbedByRevisionId),
      ));
  }

  const terms = await tx.select().from(changeOrderPaymentTerms)
    .where(eq(changeOrderPaymentTerms.revisionId, input.revisionId))
    .orderBy(asc(changeOrderPaymentTerms.position));
  if (!terms.length) return;

  // Installments made from earlier terms of this offer, and whether money or a claim already points at them.
  const previous = await tx.select({
    id: paymentInstallments.id,
    // Fully qualified: in a single-table select Drizzle writes a bare "id", which here would be the receipt's.
    touched: sql<boolean>`exists (select 1 from app.project_receipts r where r.installment_id = app.payment_installments.id) or exists (select 1 from app.payment_claims c where c.installment_id = app.payment_installments.id)`,
  }).from(paymentInstallments)
    .where(and(eq(paymentInstallments.projectId, input.projectId), eq(paymentInstallments.offerId, input.offerId), isNotNull(paymentInstallments.termId)));
  if (previous.some((row) => row.touched)) {
    await notifyProjectStaff(tx, {
      organizationId: input.organizationId, projectId: input.projectId, eventType: "payment_plan_review",
      title: "Провери платежния план",
      body: `Клиентът одобри версия ${revision.revisionNumber} с нови условия за плащане. По стария план вече има плащания, затова вноските не са сменени автоматично.`,
      href: `/app/projects/${input.projectId}?tab=payments`,
    });
    return;
  }
  if (previous.length) await tx.delete(paymentInstallments).where(inArray(paymentInstallments.id, previous.map((row) => row.id)));

  const stages = await tx.select({ id: projectMilestones.id, dueOn: projectMilestones.dueOn, lineKey: projectMilestones.scheduleLineKey }).from(projectMilestones)
    .where(and(eq(projectMilestones.projectId, input.projectId), eq(projectMilestones.offerId, input.offerId), isNotNull(projectMilestones.scheduleLineKey)));
  const today = sofiaDay.format(input.approvedAt);
  const fallback = revision.deadline ?? today;
  const amounts = termAmounts(cents(revision.total), terms.map((term) => ({ percent: Number(term.percent) })));
  await tx.insert(paymentInstallments).values(terms.map((term, index) => {
    const stage = term.scheduleLineKey ? stages.find((item) => item.lineKey === term.scheduleLineKey) : undefined;
    const trigger = term.dueTrigger as PaymentTermTrigger;
    const dueOn = trigger === "on_approval" ? today : trigger === "on_date" ? term.dueOn ?? fallback : trigger === "on_stage" ? stage?.dueOn ?? fallback : fallback;
    return {
      organizationId: input.organizationId,
      projectId: input.projectId,
      offerId: input.offerId,
      termId: term.id,
      milestoneId: stage?.id ?? null,
      kind: termPaymentKind(trigger, index, terms.length),
      title: term.title,
      amount: fromCents(amounts[index]!),
      currency: revision.currency,
      dueOn,
      // Made by the system from the approved terms; attributed to whoever wrote that version.
      createdBy: revision.createdBy,
    };
  }));
  await tx.insert(timelineEvents).values({ organizationId: input.organizationId, projectId: input.projectId, changeOrderId: input.offerId, revisionId: input.revisionId, actorType: "system", eventType: "payment_plan_created", visibility: "client", metadata: { count: terms.length } });
}
