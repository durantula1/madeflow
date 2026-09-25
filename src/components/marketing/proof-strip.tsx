import { Reveal } from "./reveal";

/** Names the problem in the client's own words, then the promise that replaces it. */
export function ProofStrip() {
  return (
    <section className="relative overflow-hidden bg-[#ff765f] text-[#102b38]">
      <div className="mx-auto grid max-w-[93.75rem] gap-8 px-[6vw] py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16 lg:py-16">
        <Reveal>
          <p className="mf-kicker">ЗВУЧИ ЛИ ПОЗНАТО?</p>
          <p className="mf-proof-quote mt-5">
            <s>„Не сме се разбрали така.“</s>
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          {/* Where the name comes from: the answer to the struck-out quote. */}
          <p className="mb-8 max-w-md border-l-2 border-[#102b38] pl-4 text-sm leading-6">
            <span className="font-serif text-lg font-semibold italic">Pakto</span>{" "}
            идва от латинското <i className="font-serif">pactum</i>,
            договорка между две страни. Римляните са знаели, че договорката
            само на думи трудно се доказва. Pakto я записва.
          </p>
          <p className="max-w-md text-base font-semibold leading-7 lg:text-lg">
            Всяка допълнителна работа е описана, оценена и одобрена от клиента
            писмено — преди да започне. Думата срещу дума отпада.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
