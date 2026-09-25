"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

import { LEGAL_DOCUMENTS } from "@/lib/legal";

import { Faq } from "./faq";
import { FlowStory } from "./flow-story";
import { PlatformTour } from "./platform-tour";
import { ProofStrip } from "./proof-strip";
import { Reveal } from "./reveal";
import { RevisionStack } from "./revision-stack";
import { SecuritySection } from "./security-section";
import { productDefinition } from "@/lib/seo/site";

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
          aria-label="Pakto"
        >
          <Image
            src="/pakto-mark.svg"
            alt=""
            width={36}
            height={36}
            loading="eager"
            className="size-9 transition-transform group-hover:-rotate-6"
          />
          <span className="text-[15px] font-black tracking-[-0.04em]">
            Pakto
          </span>
        </Link>
        <nav
          aria-label="Основна навигация"
          className="hidden items-center gap-8 font-mono text-[9px] font-bold tracking-[0.12em] md:flex"
        >
          <a href="#product">ПРОДУКТ</a>
          <a href="#workflow">КАК РАБОТИ</a>
          <a href="#security">СИГУРНОСТ</a>
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
            ОФЕРТИ И ПРОМЕНИ ПО ОБЕКТА · ОДОБРЕНИ С КОД
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mf-hero-title relative z-20">
              ПРОМЯНАТА
              <br />
              НЕ СЕ <i>губи.</i>
            </h1>
          </Reveal>
          <Reveal
            delay={0.14}
            className="relative z-20 mt-9 max-w-[400px] lg:ml-[8vw]"
          >
            <p className="text-base leading-7 text-[#284955] sm:text-lg">
              От офертата до решението на клиента — всяка версия, сума и
              обещание остава на едно място, със запис, който издържа.
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
            <p className="mt-6 flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-[#52707d]">
              <Lock className="size-3.5" /> ЗАЩИТЕН ЛИНК · КОД ПО ИМЕЙЛ ·
              ЗАКЛЮЧЕНИ ВЕРСИИ
            </p>
          </Reveal>

          <RevisionStack />
        </div>

        <div className="absolute bottom-8 left-[6vw] z-20 hidden items-center gap-3 font-mono text-[8px] tracking-[0.14em] lg:flex">
          <span>ОФЕРТА</span>
          <i className="size-1.5 rounded-full bg-[#ff765f]" />
          <span>ПРОМЯНА</span>
          <i className="size-1.5 rounded-full bg-[#ff765f]" />
          <span>ОДОБРЕНИЕ</span>
          <i className="size-1.5 rounded-full bg-[#ff765f]" />
          <span>ПЛАЩАНЕ</span>
        </div>
      </section>

      <ProofStrip />

      <FlowStory />

      <PlatformTour />

      <SecuritySection />

      <Faq />

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
              <ShieldCheck className="size-4" /> БЕТА ДОСТЪП · БЕЗПЛАТНО
            </div>
            <h2 className="mf-cta-title mt-8">
              ДАЙ НА ВСЯКА
              <br />
              ПРОМЯНА <i>памет.</i>
            </h2>
            <div className="mt-12 flex flex-col gap-6 border-t border-[#102b38]/35 pt-7 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-base leading-7">
                Създай workspace и изпрати първата оферта или промяна още днес.
                Клиентът одобрява през защитен линк и потвърждава с код.
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
        <div className="flex max-w-md flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-black">
            <span className="size-2 rounded-full bg-[#ff765f]" /> Pakto
          </div>
          <p className="text-xs leading-5 text-[#9db5b6]">{productDefinition}</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[8px] tracking-[0.14em] text-[#9db5b6]">
          <span>© 2026 PAKTO</span>
          <span>СОФИЯ · БЪЛГАРИЯ</span>
          {Object.values(LEGAL_DOCUMENTS).map((document) => (
            <Link
              key={document.href}
              href={document.href}
              className="uppercase transition-colors hover:text-[#ff765f]"
            >
              {document.label}
            </Link>
          ))}
        </div>
      </footer>
    </main>
  );
}
