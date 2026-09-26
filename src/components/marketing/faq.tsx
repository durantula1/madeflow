import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { FaqItem } from "./faq-item";
import { Reveal } from "./reveal";

export const faqQuestions = [
  {
    q: "Трябва ли клиентът да си прави профил?",
    a: "Не. Клиентът получава защитен линк към обекта, вижда офертите и решава от телефона си. Решението се потвърждава с еднократен код, изпратен на имейла му.",
  },
  {
    q: "Какво става, ако клиентът одобри нещо по грешка?",
    a: "След всяко решение клиентът получава разписка по имейл с линк за оспорване. Оспорването се записва в историята на обекта и екипът го вижда веднага.",
  },
  {
    q: "Мога ли да променя документ, след като е изпратен?",
    a: "Не директно, и това е идеята. Изпратената версия се заключва. Корекцията създава нова версия, а старата остава видима в историята.",
  },
  {
    q: "Кой от екипа вижда цените и плащанията?",
    a: "Само хората, на които си дал правото. Финансите, записването на плащания, вътрешните бележки и изпращането към клиента са отделни права.",
  },
  {
    q: "Как спирам линк, който съм изпратил на грешен човек?",
    a: "Сменяш линка от страницата на обекта. Старият спира да работи веднага, а всички отворени сесии през него се прекратяват.",
  },
] as const;

export function Faq() {
  return (
    <section id="faq" className="bg-[#f4efe4] px-[6vw] py-[14vh] lg:py-[16vh]">
      <div className="mx-auto grid max-w-[93.75rem] gap-12 lg:grid-cols-[0.75fr_1.25fr]">
        <Reveal>
          <p className="mf-kicker">ВЪПРОСИ</p>
          <h2 className="mf-section-title mt-10">
            КРАТКО
            <br />
            И <i>ясно.</i>
          </h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="border-t border-[#102b38]/20">
            {faqQuestions.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>
          <Link
            href="/faq"
            className="mt-8 inline-flex items-center gap-2 border-b border-[#102b38] pb-1 font-mono text-[0.625rem] font-bold tracking-[0.12em] transition-colors hover:border-[#e85f48] hover:text-[#e85f48]"
          >
            ВСИЧКИ ВЪПРОСИ: ЕКИП, ПРАВА, ПЛАЩАНИЯ <ArrowUpRight className="size-3.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
