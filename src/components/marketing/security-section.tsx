"use client";

import { useRef } from "react";
import {
  BadgeCheck,
  Check,
  Fingerprint,
  KeyRound,
  Link2Off,
  Lock,
  MailCheck,
  Scale,
  UserCog,
  UserX,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

import { Reveal } from "./reveal";

const pillars = [
  {
    icon: Link2Off,
    title: "Линк, който можеш да спреш",
    text: "Клиентският линк е подписан криптографски, а в базата пазим само хеша му. Когато го смениш, старият спира веднага и отворените сесии се прекратяват.",
  },
  {
    icon: MailCheck,
    title: "Код за всяко решение",
    text: "Одобрението се потвърждава с 6-цифрен код до имейла на клиента. Кодът важи 10 минути, позволява до 5 опита, а изпращането на нови кодове е ограничено.",
  },
  {
    icon: Lock,
    title: "Изпратеното не се пренаписва",
    text: "Щом една версия бъде изпратена, съдържанието ѝ се заключва на ниво база данни. Промяна е възможна само като нова версия.",
  },
  {
    icon: Scale,
    title: "Право на оспорване",
    text: "След решението клиентът получава разписка по имейл с личен линк, през който може да оспори записаното решение.",
  },
  {
    icon: UserCog,
    title: "Екипът вижда само нужното",
    text: "Девет отделни права и достъп само до избрани обекти. Вътрешните бележки и финансите не стигат до никой, който няма нужда от тях.",
  },
  {
    icon: UserX,
    title: "Твоите данни са под твой контрол",
    text: "Изход от всички устройства с един бутон, експорт на личните данни и изтриване на акаунта с 30 дни за размисъл.",
  },
] as const;

const record = [
  ["ДОКУМЕНТ", "MF-000042 · версия 2"],
  ["СУМА", "+384 € с ДДС"],
  ["ИЗПИСАНО ИМЕ", "Иван Петров"],
  ["ЧАС", "23.09.2026 · 14:32"],
  ["ПОТВЪРДЕНО", "код до iv•••@gmail.com"],
] as const;

function DecisionCertificate() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 80, damping: 22, mass: 0.4 });
  const rotateY = useTransform(progress, [0, 1], [-38, -8]);
  const rotateX = useTransform(progress, [0, 1], [22, 6]);
  const sealScale = useTransform(progress, [0.7, 1], [1.8, 1]);
  const sealOpacity = useTransform(progress, [0.7, 0.9], [0, 1]);

  return (
    <div ref={ref} className="mf-cert-stage relative mx-auto w-full max-w-[460px]">
      <motion.div
        style={reduceMotion ? undefined : { rotateY, rotateX }}
        className="mf-cert relative rounded-[28px] bg-[#fffaf0] p-6 text-[#102b38] shadow-[0_50px_100px_rgba(0,0,0,.45)] sm:p-8"
      >
        <div className="flex items-center justify-between border-b border-[#102b38]/10 pb-4">
          <p className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.14em]">
            <BadgeCheck className="size-4 text-[#16916d]" /> ЗАПИС НА РЕШЕНИЕ
          </p>
          <span className="rounded-full bg-[#d8f2e7] px-2.5 py-1 text-[9px] font-bold text-[#0b5d4f]">
            ОДОБРЕНО
          </span>
        </div>
        <dl className="divide-y divide-[#102b38]/8">
          {record.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3">
              <dt className="font-mono text-[8px] tracking-[0.12em] text-[#6c858d]">{label}</dt>
              <dd className="text-right text-[13px] font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2 rounded-xl bg-[#102b38] p-3.5 text-[#e8f1ed]">
          <p className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] text-[#b8ced2]">
            <Fingerprint className="size-3.5" /> ОТПЕЧАТЪК НА ОДОБРЕНОТО СЪДЪРЖАНИЕ
          </p>
          <p className="mt-1.5 break-all font-mono text-[10px] leading-4">
            3f9a8c02e7d1…b54e0a9dc21e
          </p>
        </div>
        <motion.div
          style={reduceMotion ? undefined : { scale: sealScale, opacity: sealOpacity }}
          className="absolute -bottom-7 -right-5 grid size-24 rotate-[-14deg] place-items-center rounded-full border-4 border-[#102b38] bg-[#ff765f] text-center font-mono text-[8px] font-black leading-3 tracking-[0.1em] shadow-[0_18px_40px_rgba(0,0,0,.35)]"
        >
          <span>
            <KeyRound className="mx-auto mb-1 size-5" />
            ЗАКЛЮЧЕНО
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export function SecuritySection() {
  return (
    <section
      id="security"
      className="mf-security relative overflow-hidden px-[6vw] py-[14vh] text-[#fbf7ec] lg:py-[18vh]"
    >
      <div className="mf-story-grid absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[1500px]">
        <Reveal className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <p className="mf-kicker text-[#b8ecda]">СИГУРНОСТ · ДОВЕРИЕ · ДОКАЗАТЕЛСТВО</p>
          <div className="min-w-0">
            <h2 className="mf-section-title">
              ВСЯКО „ДА“
              <br />
              ИМА <i>доказателство.</i>
            </h2>
            <p className="mt-8 max-w-xl text-base leading-7 text-[#c6d9da]">
              Когато има спор, думата на едната страна срещу другата не стига.
              Pakto пази кой, кога и какво точно е одобрил, така че записът
              да издържи и след месеци.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold">
              {[
                "БЕЗ ПРОФИЛ ЗА КЛИЕНТА",
                "РАБОТИ НА ТЕЛЕФОН",
                "КОД ПО ИМЕЙЛ",
                "РАЗПИСКА С ПРАВО НА ОСПОРВАНЕ",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-[#bceba8]" /> {item}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:mt-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <DecisionCertificate />
          </Reveal>

          <div className="grid gap-px overflow-hidden rounded-[24px] border border-white/10 bg-white/10 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, text }, index) => (
              <Reveal key={title} delay={index * 0.05} className="bg-[#12364b]">
                <article className="h-full p-6 sm:p-7">
                  <span className="grid size-10 place-items-center rounded-full bg-[#ff765f]/15 text-[#ff8f7a]">
                    <Icon className="size-[18px]" />
                  </span>
                  <h3 className="mt-5 text-lg font-black tracking-[-0.04em]">{title}</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#b8ced2]">{text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 font-mono text-[9px] tracking-[0.12em] text-[#9db5b6]">
          <span>КЛИЕНТСКИЯТ ПОРТАЛ:</span>
          <span>НЕ СЕ КЕШИРА</span>
          <span>НЕ ИЗПРАЩА REFERRER</span>
          <span>НЕ МОЖЕ ДА СЕ ВГРАДИ В ЧУЖД САЙТ</span>
        </Reveal>
      </div>
    </section>
  );
}
