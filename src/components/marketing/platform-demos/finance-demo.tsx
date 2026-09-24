"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal } from "lucide-react";

import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

const total = 24984;
const payments = [
  { label: "Капаро", method: "банков превод", date: "02.09", amount: 7380 },
  { label: "Междинно", method: "в брой", date: "16.09", amount: 6000 },
  { label: "Промяна MF-000042", method: "карта", date: "23.09", amount: 384 },
] as const;
const format = (value: number) => `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

export function FinanceDemo() {
  const { ref, step } = useDemoLoop(4);
  const visible = payments.slice(0, Math.min(step, payments.length));
  const paid = visible.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <DemoFrame
      frameRef={ref}
      crumb="ПЛАЩАНИЯ / КЪЩА · БОЯНА"
      title="Договор + одобрени промени"
      status={<StatusChip tone="info">{format(total)}</StatusChip>}
    >
      <div className="rounded-xl bg-[#102b38] p-4 text-[#fffaf0]">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[8px] tracking-[0.12em] text-[#b8ced2]">ПОЛУЧЕНИ</p>
            <p className="text-2xl font-black tracking-[-0.06em]">{format(paid)}</p>
          </div>
          <p className="font-mono text-[9px] text-[#b8ced2]">ОСТАВА {format(total - paid)}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-[#bceba8]"
            initial={false}
            animate={{ width: `${(paid / total) * 100}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
      <div className="mt-3 min-h-[150px] space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((payment) => (
            <motion.div
              key={payment.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between rounded-xl bg-[#f4efe4] px-3.5 py-3 text-[12px]"
            >
              <span>
                <b>{payment.label}</b>
                <span className="ml-2 font-mono text-[9px] text-[#6c858d]">{payment.date} · {payment.method}</span>
              </span>
              <span className="font-mono text-[11px] text-[#16916d]">+{format(payment.amount)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <motion.div
        initial={false}
        animate={{ opacity: step >= 4 ? 1 : 0.15, y: step >= 4 ? 0 : 8 }}
        className="mt-3 rounded-xl border border-[#102b38]/15 px-3.5 py-3"
      >
        <div className="flex items-center justify-between">
          <p className="font-mono text-[8px] tracking-[0.12em] text-[#6c858d]">МЕСЕЧНА СПРАВКА</p>
          <p className="text-[13px] font-black">Септември 2026</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Период", "Обект", "Вид плащане", "Метод"].map((filter) => (
            <span key={filter} className="flex items-center gap-1 rounded-full bg-[#c5e3e5]/70 px-2.5 py-1 text-[9px] font-bold">
              <SlidersHorizontal className="size-3" /> {filter}
            </span>
          ))}
        </div>
      </motion.div>
    </DemoFrame>
  );
}
