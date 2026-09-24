import type { Metadata } from "next";
import Link from "next/link";

import { LEGAL_DOCUMENTS } from "@/lib/legal";

export const metadata: Metadata = { title: "Условия за ползване" };

// TODO(legal): fill in the provider details in brackets and have a lawyer review before public launch.
export default function TermsPage() {
  return <>
    <p className="text-sm text-muted-foreground">Версия {LEGAL_DOCUMENTS.terms.version}</p>
    <h1>Условия за ползване</h1>
    <p>MadeFlow се предоставя от [име на дружеството], ЕИК [ЕИК]. Докато тече пилотът, ползването е безплатно и услугата може да се променя.</p>

    <h2>Профил</h2>
    <ul>
      <li>Пазиш паролата си и отговаряш за действията от профила си.</li>
      <li>Собственикът на фирмата решава кой има достъп и до какво.</li>
      <li>Можеш да изтриеш профила си по всяко време от „Настройки“.</li>
    </ul>

    <h2>Данни на фирмата</h2>
    <p>Обектите, клиентите, документите и плащанията са на фирмата. Фирмата отговаря данните на клиентите ѝ да се обработват законно. Как обработваме личните данни е описано в <Link href={LEGAL_DOCUMENTS.privacy.href} className="underline underline-offset-4">Политиката за поверителност</Link>.</p>

    <h2>Одобрения</h2>
    <p>Одобрението в портала е електронно изявление с въведено име и одитна следа. То не е квалифициран електронен подпис.</p>

    <h2>Отговорност</h2>
    <p>[Ограничение на отговорността, приложимо право и начин за разрешаване на спорове.]</p>
  </>;
}
