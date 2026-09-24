"use client";

import { motion } from "motion/react";
import { CalendarClock } from "lucide-react";

import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

const lines = [
  { label: "Демонтаж на стара замазка", qty: "48", unit: "м²", price: 25 },
  { label: "Нова циментова замазка", qty: "48", unit: "м²", price: 60 },
  { label: "Хидроизолация баня", qty: "9", unit: "м²", price: 45 },
] as const;

const format = (value: number) => `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

export function OfferDemo() {
  const { ref, step } = useDemoLoop(5);
  const visible = lines.slice(0, Math.min(step, lines.length));
  const subtotal = visible.reduce((sum, line) => sum + Number(line.qty) * line.price, 0);

  return (
    <DemoFrame
      frameRef={ref}
      crumb="ОФЕРТИ / ОФ-0017"
      title="Подове и баня · кв. Бояна"
      status={
        <StatusChip tone={step >= 5 ? "ok" : step >= 4 ? "wait" : "muted"}>
          {step >= 5 ? "ОДОБРЕНА" : step >= 4 ? "ПРИ КЛИЕНТА" : "ЧЕРНОВА"}
        </StatusChip>
      }
    >
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-1 pb-2 font-mono text-[8px] tracking-[0.12em] text-[#6c858d]">
        <span>ОПИСАНИЕ</span>
        <span>К-ВО</span>
        <span className="w-16 text-right">СУМА</span>
      </div>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <motion.div
            key={line.label}
            initial={false}
            animate={{ opacity: step > index ? 1 : 0.15, x: step > index ? 0 : 12 }}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-xl bg-[#f4efe4] px-3.5 py-3 text-[12px]"
          >
            <span className="truncate font-bold">{line.label}</span>
            <span className="font-mono text-[10px] text-[#52707d]">
              {line.qty} {line.unit} × {line.price} €
            </span>
            <span className="w-16 text-right font-mono text-[11px]">
              {format(Number(line.qty) * line.price)}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 border-t border-[#102b38]/10 pt-4">
        <div className="space-y-1 font-mono text-[10px] text-[#52707d]">
          <p>БЕЗ ДДС · {format(subtotal)}</p>
          <p>ДДС 20% · {format(subtotal * 0.2)}</p>
          <p className="flex items-center gap-1.5">
            <CalendarClock className="size-3" /> СРОК · 12 работни дни
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[8px] tracking-[0.12em] text-[#6c858d]">ОБЩО</p>
          <p className="text-2xl font-black tracking-[-0.06em]">{format(subtotal * 1.2)}</p>
          <p className="mt-1 font-mono text-[9px] text-[#16916d]">
            {step >= 5 ? "Одобрена · 14:02" : " "}
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
