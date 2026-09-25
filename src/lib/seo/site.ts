/** Public origin for absolute URLs in robots, sitemap and structured data. */
export const siteUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** The one-sentence product definition: the meta description and the landing page say the same thing. */
export const productDefinition =
  "Pakto е приложение за строителни фирми и майстори, което документира оферти и допълнителни промени и взима одобрението на клиента без регистрация.";
