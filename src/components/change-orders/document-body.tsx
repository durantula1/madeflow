import { Card, CardContent } from "@/components/ui/card";
import { vatLabel } from "@/modules/change-orders/labels";
import { discountLabel, type DiscountType } from "@/modules/change-orders/pricing";

const money = (value: string | number) => Number(value).toFixed(2);

export type DocumentBodyLine = {
  id: number | string;
  description: string;
  quantity: string | number;
  unit: string | null;
  unitPrice: string | number;
  lineTotal: string | number;
};

/**
 * The document as the client reads it: scope, reason, priced lines with totals, and the note for
 * the client. Staff and portal render this same component, so the team sees exactly what was sent.
 */
export function DocumentBody({ document }: {
  document: {
    documentKind: "offer" | "change";
    description: string;
    reason: string | null;
    clientNote: string | null;
    subtotal: string;
    discountAmount: string | null;
    discountType: DiscountType | null;
    discountValue: string | null;
    taxRate: string;
    total: string;
    lineItems: DocumentBodyLine[];
  };
}) {
  const discount = Number(document.discountAmount ?? 0);
  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <section className={document.reason ? undefined : "sm:col-span-2"}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {document.documentKind === "offer" ? "Какво включва" : "Какво се променя"}
            </p>
            <p className="mt-1.5 leading-7 whitespace-pre-line">{document.description}</p>
          </section>
          {document.reason ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Защо е необходимо</p>
              <p className="mt-1.5 leading-7 whitespace-pre-line">{document.reason}</p>
            </section>
          ) : null}
        </div>
        {document.lineItems.length ? (
          <section className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="hidden bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground sm:table-header-group">
                <tr>
                  <th className="px-3 py-2 font-semibold">Позиция</th>
                  <th className="px-3 py-2 text-right font-semibold">Количество</th>
                  <th className="px-3 py-2 text-right font-semibold">Ед. цена</th>
                  <th className="px-3 py-2 text-right font-semibold">Сума</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {document.lineItems.map((line) => (
                  <tr key={line.id} className="align-top">
                    <td className="px-3 py-2.5">
                      <p>{line.description}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {Number(line.quantity)} {line.unit} × {money(line.unitPrice)}
                      </p>
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {Number(line.quantity)} {line.unit}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {money(line.unitPrice)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{money(line.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30 text-muted-foreground">
                {discount ? <>
                  <tr>
                    <td colSpan={3} className="px-3 pt-2.5 text-right">Сума по редове</td>
                    <td className="px-3 pt-2.5 text-right tabular-nums text-foreground">{money(Number(document.subtotal) + discount)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 pt-1 text-right text-primary">{discountLabel(document.discountType, document.discountValue)}</td>
                    <td className="px-3 pt-1 text-right font-medium tabular-nums text-primary">−{money(discount)}</td>
                  </tr>
                </> : null}
                <tr>
                  <td colSpan={3} className="px-3 pt-2.5 text-right">Основа</td>
                  <td className="px-3 pt-2.5 text-right tabular-nums text-foreground">{money(document.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-3 pb-2.5 text-right">{Number(document.taxRate) ? vatLabel(document.taxRate) : "Не се начислява ДДС"}</td>
                  <td className="px-3 pb-2.5 text-right tabular-nums text-foreground">{money(Number(document.total) - Number(document.subtotal))}</td>
                </tr>
                <tr className="border-t text-foreground">
                  <td colSpan={3} className="px-3 py-2.5 text-right font-semibold">Общо</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(document.total)}</td>
                </tr>
              </tfoot>
            </table>
          </section>
        ) : null}
        {document.clientNote ? <p className="rounded-xl bg-muted p-4 text-sm whitespace-pre-line">{document.clientNote}</p> : null}
      </CardContent>
    </Card>
  );
}
