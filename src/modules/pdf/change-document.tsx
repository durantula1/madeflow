import path from "node:path";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

Font.register({ family: "MadeFlowCyrillic", fonts: [
  { src: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-cyrillic-ext-400-normal.woff"), fontWeight: 400 },
  { src: path.join(process.cwd(), "node_modules/@fontsource/noto-sans/files/noto-sans-cyrillic-ext-600-normal.woff"), fontWeight: 600 },
] });

const styles = StyleSheet.create({
  page: { fontFamily: "MadeFlowCyrillic", padding: 36, color: "#252820", fontSize: 10 },
  header: { backgroundColor: "#222920", padding: 20, borderRadius: 8, color: "#fff" },
  brand: { color: "#9dd3a8", fontSize: 9, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: 600 },
  meta: { fontSize: 8, color: "#ddd", marginTop: 8 },
  section: { marginTop: 18, borderBottom: "1 solid #ddd", paddingBottom: 12 },
  heading: { fontSize: 12, fontWeight: 600, marginBottom: 7 },
  row: { display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 5 },
  total: { marginTop: 12, padding: 12, backgroundColor: "#eff3ed", borderRadius: 6, display: "flex", flexDirection: "row", justifyContent: "space-between", fontWeight: 600 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7, color: "#777" },
});

type Line = { description: string; quantity: string; unit: string | null; unitPrice: string; lineTotal: string };
export function ChangePdfDocument({ organization, project, contact, kind, code, revision, lines, decision }: {
  organization: string; project: string; contact: string; kind: "offer" | "change"; code: string;
  revision: { title: string; description: string; reason: string | null; revisionNumber: number; changeKind: string; subtotal: string; taxAmount: string; total: string; currency: string; taxRate: string; agreedDeadline: string | null; contentHash: string | null; frozenAt: Date | null; clientNote: string | null };
  lines: Line[]; decision: { decision: string; typedName: string; createdAt: Date } | null;
}) {
  return <Document title={`${code} · ${revision.title}`} author={organization}><Page size="A4" style={styles.page}>
    <View style={styles.header}><Text style={styles.brand}>{organization} · MADE FLOW</Text><Text style={styles.title}>{revision.title}</Text><Text style={styles.meta}>{kind === "offer" ? "Оферта" : "Промяна"} {code} · Версия {revision.revisionNumber} · Обект: {project} · Клиент: {contact}</Text></View>
    <View style={styles.section}><Text style={styles.heading}>Договорен обхват</Text><Text>{revision.description}</Text>{revision.reason ? <Text style={{ marginTop: 6 }}>Причина: {revision.reason}</Text> : null}{revision.clientNote ? <Text style={{ marginTop: 6 }}>Бележка: {revision.clientNote}</Text> : null}</View>
    <View style={styles.section}><Text style={styles.heading}>Позиции</Text>{lines.length ? lines.map((line, index) => <View key={index} style={styles.row}><Text style={{ width: "58%" }}>{line.description}</Text><Text>{line.quantity} {line.unit ?? ""} × {line.unitPrice}</Text><Text>{line.lineTotal}</Text></View>) : <View style={styles.row}><Text style={{ width: "58%" }}>{revision.title}</Text><Text>1 усл.</Text><Text>{revision.changeKind === "credit" ? "−" : ""}{revision.subtotal} {revision.currency}</Text></View>}</View>
    <View style={styles.section}><Text style={styles.heading}>Срок и цена</Text><View style={styles.row}><Text>Договорен краен срок</Text><Text>{revision.agreedDeadline ?? "Без промяна спрямо обекта"}</Text></View><View style={styles.row}><Text>Данъчна ставка</Text><Text>{revision.taxRate}%</Text></View><View style={styles.row}><Text>Данък</Text><Text>{revision.changeKind === "credit" ? "−" : ""}{revision.taxAmount} {revision.currency}</Text></View><View style={styles.total}><Text>{kind === "offer" ? "Стойност на офертата" : "Стойност на промяната"}</Text><Text>{revision.total} {revision.currency}</Text></View></View>
    {decision ? <View style={styles.section}><Text style={styles.heading}>Решение на клиента</Text><Text>{decision.decision === "approved" ? "Одобрено" : decision.decision === "declined" ? "Отказано" : "Поискана корекция"} от {decision.typedName} на {decision.createdAt.toLocaleString("bg-BG")}</Text></View> : null}
    <Text style={styles.footer} fixed>Изпратена версия: {revision.frozenAt?.toLocaleString("bg-BG") ?? "—"} · Отпечатък: {revision.contentHash?.slice(0, 32) ?? "—"} · Страница <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} /></Text>
  </Page></Document>;
}
