"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, Lock, Mail } from "lucide-react";

import { useDemoLoop } from "./demo-frame";

const code = "482913";
const name = "Иван Петров";

export function PortalDemo() {
  const { ref, step } = useDemoLoop(4, 1400, 3600);

  return (
    <div ref={ref} className="mx-auto w-full max-w-[330px]">
      <div className="rounded-[38px] bg-[#102b38] p-2.5 shadow-[0_30px_70px_rgba(16,43,56,.3)]">
        <div className="relative min-h-[470px] overflow-hidden rounded-[30px] bg-[#fffaf0] px-5 pb-6 pt-8">
          <span className="absolute left-1/2 top-2.5 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#102b38]/15" />
          <div className="flex items-center justify-between font-mono text-[8px] tracking-[0.12em] text-[#6c858d]">
            <span className="flex items-center gap-1"><Lock className="size-3" /> ЗАЩИТЕН ПРЕГЛЕД</span>
            <span>v2</span>
          </div>
          <h4 className="mt-4 text-xl font-black leading-tight tracking-[-0.05em]">
            Преместване на два контакта
          </h4>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className="rounded-xl bg-[#bceba8] p-2.5"><b className="block text-base tracking-[-0.05em]">+384 €</b>крайна цена</div>
            <div className="rounded-xl bg-[#c5e3e5] p-2.5"><b className="block text-base tracking-[-0.05em]">+2 дни</b>към срока</div>
          </div>

          <AnimatePresence mode="wait">
            {step <= 1 && (
              <motion.div key="decide" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-5">
                <p className="font-mono text-[8px] tracking-[0.12em] text-[#6c858d]">ИМЕ И ФАМИЛИЯ</p>
                <div className="mt-1.5 h-10 rounded-xl border border-[#102b38]/20 bg-white px-3 text-[13px] font-bold leading-10">
                  {step >= 1 ? name : <span className="text-[#102b38]/30">Изпиши името си</span>}
                  {step === 1 && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-[#102b38] align-middle" />}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <span className="rounded-xl border border-[#102b38]/15 py-3 text-center">ИСКАМ ПРОМЯНА</span>
                  <span className={`rounded-xl py-3 text-center text-white transition-all duration-300 ${step >= 1 ? "scale-[0.97] bg-[#13513f]" : "bg-[#1e765d]"}`}>ОДОБРЯВАМ</span>
                </div>
              </motion.div>
            )}
            {(step === 2 || step === 3) && (
              <motion.div key="code" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mt-5">
                <p className="flex items-center gap-1.5 text-[11px] font-bold">
                  <Mail className="size-3.5 text-[#e86650]" /> Изпратихме код до iv•••@gmail.com
                </p>
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {code.split("").map((digit, index) => (
                    <motion.span
                      key={index}
                      initial={false}
                      animate={{
                        borderColor: step === 3 ? "#1e765d" : "rgba(16,43,56,.2)",
                        scale: step === 3 ? [1, 1.12, 1] : 1,
                      }}
                      transition={{ delay: step === 3 ? index * 0.12 : 0 }}
                      className="grid h-11 place-items-center rounded-lg border-2 bg-white text-lg font-black"
                    >
                      {step === 3 ? digit : ""}
                    </motion.span>
                  ))}
                </div>
                <p className="mt-3 font-mono text-[8px] tracking-[0.1em] text-[#6c858d]">ВАЛИДЕН 10 МИН · ДО 5 ОПИТА</p>
              </motion.div>
            )}
            {step >= 4 && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-5 rounded-2xl bg-[#d8f2e7] p-4 text-center">
                <CircleCheck className="mx-auto size-8 text-[#16916d]" />
                <p className="mt-2 text-sm font-black">Решението е записано</p>
                <p className="mt-1 text-[10px] text-[#35535e]">{name} · 14:32 · потвърдено с код</p>
                <p className="mt-2 font-mono text-[8px] tracking-[0.1em] text-[#52707d]">РАЗПИСКАТА Е НА ИМЕЙЛА ТИ</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
