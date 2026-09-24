import { Plus } from "lucide-react";

import { Reveal } from "./reveal";

const questions = [
  {
    q: "Трябва ли клиентът да си прави профил?",
    a: "Не. Клиентът получава защитен линк към обекта, вижда документите и решава от телефона си. Решението се потвърждава с еднократен код, изпратен на имейла му.",
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
      <div className="mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[0.75fr_1.25fr]">
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
            {questions.map(({ q, a }) => (
              <details key={q} className="mf-faq group border-b border-[#102b38]/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-black tracking-[-0.03em] sm:text-xl">
                  {q}
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#102b38]/30 transition-transform duration-300 group-open:rotate-45 group-open:bg-[#ff765f]">
                    <Plus className="size-4" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-[15px] leading-7 text-[#49626b]">{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
