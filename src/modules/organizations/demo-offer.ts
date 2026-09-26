/**
 * A sample offer for previewing the company logo: the settings dialog renders it in the portal
 * layout and /api/organization/demo-offer renders it with the real PDF template.
 */
const lines = [
  { description: "Демонтаж на стара облицовка и извозване", quantity: "12", unit: "м²", unitPrice: "8.00" },
  { description: "Хидроизолация в два слоя с армираща лента", quantity: "12", unit: "м²", unitPrice: "22.00" },
  { description: "Лепене на гранитогрес 60×60, вкл. фугиране", quantity: "28", unit: "м²", unitPrice: "34.00" },
  { description: "Монтаж на санитария и смесители", quantity: "1", unit: "к-т", unitPrice: "380.00" },
].map((line, index) => ({ id: index + 1, ...line, lineTotal: (Number(line.quantity) * Number(line.unitPrice)).toFixed(2) }));

const subtotal = lines.reduce((sum, line) => sum + Number(line.lineTotal), 0);
const taxAmount = subtotal * 0.2;

export const demoOffer = {
  code: "ОФ-ДЕМО",
  title: "Ремонт на баня",
  project: "Апартамент, ул. „Витоша“ 12",
  siteAddress: "София, ул. „Витоша“ 12, ет. 3",
  contact: "Мария Петрова",
  agreedDeadline: "2026-11-20",
  document: {
    documentKind: "offer" as const,
    description: "Пълен ремонт на банята: демонтаж на старата облицовка, хидроизолация, нови плочки по стени и под и монтаж на санитарията. Материалите за хидроизолация са включени, плочките се доставят от клиента.",
    reason: null,
    clientNote: "Работим в делнични дни от 8:30 до 17:30. Водата се спира само в деня на монтажа.",
    subtotal: subtotal.toFixed(2),
    discountAmount: null,
    discountType: null,
    discountValue: null,
    taxRate: "20.00",
    taxAmount: taxAmount.toFixed(2),
    total: (subtotal + taxAmount).toFixed(2),
    currency: "EUR",
    lineItems: lines,
  },
};
