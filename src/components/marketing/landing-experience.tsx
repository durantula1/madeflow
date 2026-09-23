"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRef } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  FileCheck2,
  Layers3,
  MessageSquareText,
  Ruler,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

const chapters = [
  {
    number: "01",
    eyebrow: "ДОКУМЕНТИРАНЕ",
    title: (
      <>
        ПРОМЯНАТА
        <br />
        ЗАПОЧВА <i>ясно.</i>
      </>
    ),
    text: "Глас, снимки, крайна цена и отражение върху срока се събират на място — докато детайлите още са пред очите ти.",
    range: [0, 0.02, 0.19, 0.27],
  },
  {
    number: "02",
    eyebrow: "ИЗПРАЩАНЕ",
    title: (
      <>
        ЕДИН ЛИНК.
        <br />
        ЕДНО <i>да.</i>
      </>
    ),
    text: "Клиентът вижда точната версия, оставя коментар или я одобрява. Всяко решение остава записано.",
    range: [0.2, 0.3, 0.44, 0.54],
  },
  {
    number: "03",
    eyebrow: "ВЕРСИИ",
    title: (
      <>
        НИЩО НЕ СЕ
        <br />
        <i>презаписва.</i>
      </>
    ),
    text: "Всяка корекция създава нова ревизия. Одобреното остава заключено, а следващият разговор започва от ясна база.",
    range: [0.47, 0.57, 0.7, 0.8],
  },
  {
    number: "04",
    eyebrow: "ИСТОРИЯ",
    title: (
      <>
        ИСТОРИЯТА
        <br />
        ОСТАВА <i>цяла.</i>
      </>
    ),
    text: "Кой, кога и какво е решил остава в дневника на обекта — за екипа, клиента и следващия етап от работата.",
    range: [0.73, 0.83, 1, 1],
  },
] as const;

const features = [
  {
    icon: Layers3,
    number: "01",
    title: "Под минута на обекта",
    text: "Кратко описание, гласова бележка, до три снимки, цена и срок — в един бърз поток.",
    accent: "sky",
  },
  {
    icon: MessageSquareText,
    number: "02",
    title: "Одобрение без профил",
    text: "Изпращаш защитена връзка. Клиентът преглежда, коментира и одобрява от телефона си.",
    accent: "coral",
  },
  {
    icon: Wrench,
    number: "03",
    title: "История без спор",
    text: "Всяка изпратена версия и всяко решение имат точен час, автор и непроменимо съдържание.",
    accent: "lime",
  },
] as const;

const storyStages = ["ЧЕРНОВА", "ИЗПРАЩАНЕ", "РЕШЕНИЕ", "ИЗПЪЛНЕНИЕ"] as const;

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function StoryChapter({
  chapter,
  progress,
}: {
  chapter: (typeof chapters)[number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, [...chapter.range], [0, 1, 1, 0]);
  const y = useTransform(progress, [...chapter.range], [32, 0, 0, -32]);

  return (
    <motion.article
      style={{ opacity, y }}
      className="mf-story-copy absolute inset-x-0 top-1/2 -translate-y-1/2"
    >
      <div className="mf-kicker text-[#b8ecda]">
        {chapter.number} — {chapter.eyebrow}
      </div>
      <h2>{chapter.title}</h2>
      <p>{chapter.text}</p>
    </motion.article>
  );
}

function StoryStatus({
  progress,
  threshold,
  icon: Icon,
  title,
  detail,
}: {
  progress: MotionValue<number>;
  threshold: number;
  icon: typeof Ruler;
  title: string;
  detail: string;
}) {
  const active = useTransform(
    progress,
    [Math.max(0, threshold - 0.08), threshold],
    [0.25, 1],
  );
  const x = useTransform(
    progress,
    [Math.max(0, threshold - 0.08), threshold],
    [12, 0],
  );

  return (
    <motion.div
      style={{ opacity: active, x }}
      className="flex items-center gap-3 border-b border-[#17364a]/10 py-3 last:border-0"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#d8f2e7] text-[#0b5d4f]">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[#102b38]">{title}</p>
        <p className="truncate text-[11px] text-[#52707d]">{detail}</p>
      </div>
      <CircleCheck className="size-4 text-[#16916d]" />
    </motion.div>
  );
}

function FlowStory() {
  const storyRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.4,
  });
  const passportX = useTransform(smoothProgress, [0, 1], [28, -28]);
  const passportY = useTransform(smoothProgress, [0, 0.5, 1], [20, -16, 12]);
  const passportRotate = useTransform(smoothProgress, [0, 0.5, 1], [3, -2, 1]);
  const routeScale = useTransform(smoothProgress, [0, 1], [0, 1]);
  const routeLeft = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);
  const glowX = useTransform(smoothProgress, [0, 1], ["-25%", "35%"]);

  return (
    <section
      ref={storyRef}
      id="workflow"
      className="mf-story relative h-[400vh]"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          style={{ x: glowX }}
          className="pointer-events-none absolute left-1/2 top-1/2 size-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#236d86]/30 blur-[100px]"
        />
        <div className="mf-story-grid absolute inset-0" />
        <div className="absolute left-[6vw] right-[6vw] top-24 z-20 flex items-center justify-between font-mono text-[9px] tracking-[0.16em] text-[#c6dfdf]">
          <span>LIVE CHANGE RECORD</span>
          <span>MF / 0042 / SOFIA</span>
        </div>

        <div className="relative z-10 mx-auto grid h-full max-w-[1500px] items-center gap-10 px-[6vw] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative h-[52vh]">
            {chapters.map((chapter) => (
              <StoryChapter
                key={chapter.number}
                chapter={chapter}
                progress={smoothProgress}
              />
            ))}
          </div>

          <div className="relative flex min-h-[48vh] items-center justify-center lg:min-h-[66vh]">
            <motion.div
              style={{ x: passportX, y: passportY, rotate: passportRotate }}
              className="mf-passport relative z-10 w-[min(90%,460px)] overflow-hidden rounded-[28px] border border-white/40 bg-[#f8f2e7] p-3 text-[#102b38] shadow-[0_45px_100px_rgba(0,14,28,.55)]"
            >
              <div className="rounded-[21px] border border-[#17364a]/10 bg-white/80 p-5 backdrop-blur-xl sm:p-6">
                <div className="flex items-start justify-between border-b border-[#17364a]/10 pb-5">
                  <div>
                    <p className="font-mono text-[9px] font-bold tracking-[0.14em] text-[#ef6c54]">
                      MF-000042
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-[-0.04em] sm:text-2xl">
                      Къща · Бояна
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#ffe7a8] px-3 py-1.5 text-[10px] font-bold text-[#755710]">
                    ЧАКА ОДОБРЕНИЕ
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-4">
                  {[
                    ["КЛИЕНТ", "Иван П."],
                    ["ВЕРСИЯ", "v2"],
                    ["СТОЙНОСТ", "+384 €"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-[#eef3f0] p-2.5">
                      <p className="font-mono text-[7px] tracking-[0.1em] text-[#6c858d]">
                        {label}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-bold">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.05}
                  icon={Ruler}
                  title="Промяната е документирана"
                  detail="Глас, снимки, цена и срок"
                />
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.3}
                  icon={FileCheck2}
                  title="Версия v2 е изпратена"
                  detail="Одобрено от клиента · 14:32"
                />
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.58}
                  icon={Layers3}
                  title="Клиентът е одобрил"
                  detail="Решението е заключено"
                />
                <StoryStatus
                  progress={smoothProgress}
                  threshold={0.83}
                  icon={Wrench}
                  title="Работата е изпълнена"
                  detail="Пълна следа към промяната"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mf-story-rail absolute z-20 h-px bg-white/20">
          <motion.span
            style={{ scaleX: routeScale }}
            className="absolute inset-0 origin-left bg-[#ff7b63] shadow-[0_0_16px_rgba(255,123,99,.45)]"
          />
          {storyStages.map((label, index) => (
            <span
              key={label}
              className="absolute top-0 -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(index / (storyStages.length - 1)) * 100}%`,
              }}
            >
              <i className="grid size-6 place-items-center rounded-full border border-white/25 bg-[#12364b] font-mono text-[8px] not-italic text-[#e8f1ed] shadow-[0_0_0_5px_rgba(18,54,75,.9)]">
                0{index + 1}
              </i>
              <b className="absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[8px] font-medium tracking-[0.12em] text-[#b8ced2] max-sm:hidden">
                {label}
              </b>
            </span>
          ))}
          <motion.span
            style={{ left: routeLeft }}
            className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[#12364b] bg-[#ff7b63] shadow-[0_0_30px_rgba(255,123,99,.75)]"
          >
            <ArrowRight className="size-4 text-[#102b38]" />
          </motion.span>
        </div>

        <div className="absolute bottom-7 left-[6vw] z-20 flex items-center gap-3 font-mono text-[8px] tracking-[0.14em] text-[#c6dfdf]">
          <span className="h-14 w-px bg-white/25" />
          SCROLL TO FOLLOW
        </div>
      </div>
    </section>
  );
}

export function LandingExperience({ signedIn = false }: { signedIn?: boolean }) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const pageProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  return (
    <main className="marketing-page min-h-screen overflow-clip bg-[#f4efe4] text-[#102b38]">
      <div className="mf-grain" aria-hidden="true" />
      <motion.div
        style={{ scaleX: pageProgress }}
        className="fixed left-0 top-0 z-[80] h-[3px] w-full origin-left bg-[#ff765f]"
      />

      <header className="mf-nav fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[5vw] py-5 text-[#102b38]">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="MadeFlow"
        >
          <Image
            src="/madeflow-mark.svg"
            alt=""
            width={36}
            height={36}
            className="size-9 transition-transform group-hover:-rotate-6"
          />
          <span className="text-[15px] font-black tracking-[-0.04em]">
            MadeFlow<sup className="ml-0.5 text-[6px]">®</sup>
          </span>
        </Link>
        <nav
          aria-label="Основна навигация"
          className="hidden items-center gap-8 font-mono text-[9px] font-bold tracking-[0.12em] md:flex"
        >
          <a href="#product">ПРОДУКТ</a>
          <a href="#workflow">КАК РАБОТИ</a>
          <a href="#beta">БЕТА</a>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/app"
              prefetch={true}
              className="flex items-center gap-2 border border-[#102b38]/50 bg-[#ff765f] px-3.5 py-2.5 font-mono text-[9px] font-bold tracking-[0.09em] text-[#102b38]"
            >
              КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden px-3 py-2 text-xs font-bold sm:block"
              >
                ВХОД
              </Link>
              <Link
                href="/sign-up"
                className="flex items-center gap-2 border border-[#102b38]/50 bg-[#f4efe4]/70 px-3.5 py-2.5 font-mono text-[9px] font-bold tracking-[0.09em] backdrop-blur-md transition-colors hover:bg-[#ff765f]"
              >
                ЗАПОЧНИ <ArrowUpRight className="size-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mf-hero relative min-h-[820px] overflow-hidden px-[6vw] pb-14 pt-36 lg:min-h-screen lg:pt-[18vh]">
        <div className="mf-hero-grid absolute inset-0" />
        <motion.div
          aria-hidden="true"
          className="absolute top-[6vh] right-[2vw] size-[min(44vw,560px)] rounded-full bg-[#a6d8df] blur-[2px]"
          animate={reduceMotion ? undefined : { x: [0, 24, 0], y: [0, -18, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute -bottom-[16vw] left-[30vw] size-[34vw] min-h-[300px] min-w-[300px] rounded-full bg-[#bceba8]/80 blur-[4px]"
          animate={reduceMotion ? undefined : { scale: [1, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 mx-auto max-w-[1500px]">
          <Reveal className="mf-kicker mb-7 flex items-center gap-3">
            <span className="size-2 rounded-full bg-[#ff765f]" />
            ПРОМЕНИТЕ ПО ОБЕКТА · ДОКУМЕНТИРАНИ И ОДОБРЕНИ
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mf-hero-title">
              ПРОМЯНАТА
              <br />
              НЕ СЕ <i>губи.</i>
            </h1>
          </Reveal>
          <Reveal
            delay={0.14}
            className="relative z-20 mt-9 max-w-[380px] lg:ml-[8vw]"
          >
            <p className="text-base leading-7 text-[#284955] sm:text-lg">
              От гласовата бележка на обекта до решението на клиента — всяка
              версия, сума и обещание остава на едно място.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={signedIn ? "/app" : "/sign-up"}
                prefetch={signedIn}
                className="mf-primary-button"
              >
                {signedIn ? "КЪМ ОБЕКТИТЕ" : "СЪЗДАЙ WORKSPACE"}{" "}
                <ArrowRight className="size-4" />
              </Link>
              <a
                href="#workflow"
                className="mf-round-button"
                aria-label="Виж работния поток"
              >
                <ArrowDown className="size-5" />
              </a>
            </div>
          </Reveal>

          <motion.div
            initial={
              reduceMotion ? false : { opacity: 0, x: "20vw", rotate: 8 }
            }
            animate={{ opacity: 1, x: 0, rotate: -3 }}
            transition={{
              duration: 1.25,
              delay: 0.25,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mf-hero-card absolute right-[-2vw] top-[31vh] z-10 hidden w-[min(42vw,610px)] rounded-[34px] border border-white/60 bg-[#18394c] p-3 shadow-[0_45px_90px_rgba(22,58,73,.35)] lg:block"
          >
            <div className="rounded-[26px] bg-[#fbf8f0] p-7">
              <div className="flex items-start justify-between border-b border-[#102b38]/10 pb-5">
                <div>
                  <p className="font-mono text-[9px] font-bold tracking-[0.15em] text-[#e86650]">
                    MF-000042 / LIVE
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                    Къща · кв. Бояна
                  </h2>
                </div>
                <span className="rounded-full bg-[#fee8a5] px-3 py-1.5 text-[10px] font-bold text-[#73570d]">
                  ЧАКА ОДОБРЕНИЕ
                </span>
              </div>
              <div className="mt-5 grid grid-cols-[1.1fr_.9fr] gap-3">
                <div className="rounded-2xl bg-[#dceeea] p-5">
                  <p className="mf-card-label">ПОСЛЕДНА ПРОМЯНА</p>
                  <p className="mt-10 text-lg font-black leading-tight tracking-[-0.04em]">
                    Двата контакта се местят с 40 см.
                  </p>
                  <p className="mt-3 font-mono text-[10px] text-[#53706f]">
                    + 384 € · ПРЕДИ 8 МИН.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#ff8069] p-4">
                    <p className="mf-card-label">ВЕРСИЯ</p>
                    <p className="mt-6 text-4xl font-black tracking-[-0.08em]">
                      v2
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#bceba8] p-4">
                    <p className="mf-card-label">СТОЙНОСТ</p>
                    <p className="mt-5 text-xl font-black tracking-[-0.05em]">
                      +384 €
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        <div className="absolute bottom-8 right-[5vw] z-20 hidden items-center gap-3 font-mono text-[8px] tracking-[0.14em] lg:flex">
          <span>ДОКУМЕНТИРАНЕ</span>
          <i className="size-1.5 rounded-full bg-[#ff765f]" />
          <span>ОДОБРЕНИЕ</span>
          <i className="size-1.5 rounded-full bg-[#ff765f]" />
          <span>ИЗПЪЛНЕНИЕ</span>
        </div>
      </section>

      <section className="grid bg-[#ff765f] px-[6vw] py-8 sm:grid-cols-3">
        {[
          ["1", "жива версия"],
          ["1 линк", "без клиентски профил"],
          ["100%", "проследима история"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="flex items-end justify-between border-b border-[#102b38]/25 py-5 last:border-0 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-0"
          >
            <strong className="text-4xl font-black tracking-[-0.08em] lg:text-6xl">
              {value}
            </strong>
            <span className="max-w-28 text-right text-xs font-semibold">
              {label}
            </span>
          </div>
        ))}
      </section>

      <FlowStory />

      <section
        id="product"
        className="bg-[#f4efe4] px-[6vw] py-[14vh] lg:py-[18vh]"
      >
        <div className="mx-auto max-w-[1500px]">
          <Reveal className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <p className="mf-kicker">СЪЗДАДЕНО ЗА РЕАЛНАТА РАБОТА</p>
            <div>
              <h2 className="mf-section-title">
                ПО-МАЛКО ШУМ.
                <br />
                ПОВЕЧЕ <i>яснота.</i>
              </h2>
              <p className="mt-8 max-w-xl text-base leading-7 text-[#49626b]">
                MadeFlow подрежда най-рисковия разговор в строителството —
                промяната след началото — без да забавя работата на обекта.
              </p>
            </div>
          </Reveal>

          <div className="mt-20 grid gap-px overflow-hidden border border-[#102b38]/20 bg-[#102b38]/20 lg:grid-cols-3">
            {features.map(
              ({ icon: Icon, number, title, text, accent }, index) => (
                <Reveal key={title} delay={index * 0.08}>
                  <article className={`mf-feature-card mf-feature-${accent}`}>
                    <div className="flex items-center justify-between">
                      <span className="grid size-12 place-items-center rounded-full border border-[#102b38]/25">
                        <Icon className="size-5" />
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.14em]">
                        {number}
                      </span>
                    </div>
                    <div className="mt-24 lg:mt-32">
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </article>
                </Reveal>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#c5e3e5] px-[6vw] py-[14vh] lg:py-[18vh]">
        <div className="mf-approval-grid absolute inset-0 opacity-50" />
        <div className="relative z-10 mx-auto grid max-w-[1500px] gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <p className="mf-kicker">КЛИЕНТЪТ СЪЩО ВИЖДА ЯСНО</p>
            <h2 className="mf-section-title">
              „ДА“ БЕЗ
              <br />
              <i>догадки.</i>
            </h2>
            <p className="mt-8 max-w-md text-base leading-7 text-[#35535e]">
              Красив, защитен портал показва само това, което клиентът трябва да
              види: точната версия, цената и ясни действия за одобрение или
              промяна.
            </p>
            <div className="mt-8 flex flex-wrap gap-5 text-xs font-bold">
              {[
                "БЕЗ ПРОФИЛ ЗА КЛИЕНТА",
                "РАБОТИ НА ТЕЛЕФОН",
                "ИСТОРИЯ НА РЕШЕНИЯТА",
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <Check className="size-4" /> {item}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12} className="relative">
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -8, rotate: 0 }}
              className="mx-auto max-w-[620px] rotate-2 rounded-[34px] bg-[#102b38] p-3 shadow-[0_40px_80px_rgba(22,58,73,.3)] transition-transform"
            >
              <div className="rounded-[26px] bg-[#fffaf0] p-6 sm:p-8">
                <div className="flex items-center justify-between border-b border-[#102b38]/10 pb-5">
                  <div className="flex items-center gap-2 font-black">
                    <Image
                      src="/madeflow-mark.svg"
                      alt=""
                      width={32}
                      height={32}
                      className="size-8"
                    />
                    MadeFlow
                  </div>
                  <span className="font-mono text-[8px] tracking-[0.14em] text-[#66808a]">
                    ЗАЩИТЕН ПРЕГЛЕД
                  </span>
                </div>
                <div className="py-8 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#d8f2e7] text-[#147259]">
                    <Sparkles className="size-6" />
                  </span>
                  <p className="mt-5 text-xs font-bold text-[#e86650]">
                    ВЕРСИЯ 3
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] sm:text-3xl">
                    Къща · кв. Бояна
                  </h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#5f747c]">
                    Прегледайте промяната, крайната цена и отражението върху
                    срока преди да вземете решение.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#102b38]/15 px-4 py-3 text-center text-xs font-bold">
                    ИСКАМ ПРОМЯНА
                  </div>
                  <div className="rounded-xl bg-[#1e765d] px-4 py-3 text-center text-xs font-bold text-white">
                    ОДОБРЯВАМ ВЕРСИЯТА
                  </div>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      <section
        id="beta"
        className="relative overflow-hidden bg-[#ff765f] px-[6vw] py-[14vh] lg:min-h-[86vh] lg:py-[17vh]"
      >
        <div className="pointer-events-none absolute -bottom-[0.23em] -right-[0.03em] select-none text-[38vw] font-black leading-none tracking-[-0.16em] text-white/20">
          GO
        </div>
        <div className="relative z-10 mx-auto max-w-[1500px]">
          <Reveal>
            <div className="mf-kicker flex items-center gap-3">
              <ShieldCheck className="size-4" /> БЕТА ДОСТЪП · БЕЗ STRIPE
            </div>
            <h2 className="mf-cta-title mt-8">
              ДАЙ НА ВСЯКА
              <br />
              ПРОМЯНА <i>памет.</i>
            </h2>
            <div className="mt-12 flex flex-col gap-6 border-t border-[#102b38]/35 pt-7 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-base leading-7">
                Създай workspace и документирай първата реална промяна още днес.
                Клиентът одобрява директно през защитен линк.
              </p>
              <Link
                href={signedIn ? "/app" : "/sign-up"}
                prefetch={signedIn}
                className="mf-dark-button"
              >
                {signedIn ? "КЪМ ОБЕКТИТЕ" : "ЗАПОЧНИ БЕЗПЛАТНО"}{" "}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="flex flex-col gap-5 bg-[#102b38] px-[6vw] py-8 text-[#d9e7e4] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-black">
          <span className="size-2 rounded-full bg-[#ff765f]" /> MadeFlow
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[8px] tracking-[0.14em] text-[#9db5b6]">
          <span>© 2026 MADEFLOW</span>
          <span>SOFIA · BULGARIA · EU</span>
          <span>СЪЗДАДЕНО ЗА ЯСНИ ПРОМЕНИ</span>
        </div>
      </footer>
    </main>
  );
}
