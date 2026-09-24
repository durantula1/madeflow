import { Reveal } from "./reveal";

/** Names the problem in the client's own words, then the promise that replaces it. */
export function ProofStrip() {
  return (
    <section className="relative overflow-hidden bg-[#ff765f] text-[#102b38]">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-[6vw] py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16 lg:py-16">
        <Reveal>
          <p className="mf-kicker">ЗВУЧИ ЛИ ПОЗНАТО?</p>
          <p className="mf-proof-quote mt-5">
            <s>„Не сме се разбрали така.“</s>
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <p className="max-w-md text-base font-semibold leading-7 lg:text-lg">
            Всяка допълнителна работа е описана, оценена и одобрена от клиента
            писмено — преди да започне. Думата срещу дума отпада.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
