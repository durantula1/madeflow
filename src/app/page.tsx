import type { Metadata } from "next";
import { cookies } from "next/headers";

import "./marketing.css";

import { faqQuestions } from "@/components/marketing/faq";
import { LandingExperience } from "@/components/marketing/landing-experience";
import { productDefinition, siteUrl } from "@/lib/seo/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** Organization, product and the visible FAQ, word for word, for search and AI answer engines. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Pakto",
      url: `${siteUrl}/`,
      logo: `${siteUrl}/pakto-mark.svg`,
      address: { "@type": "PostalAddress", addressLocality: "София", addressCountry: "BG" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Pakto",
      url: `${siteUrl}/`,
      description: productDefinition,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "bg",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqQuestions.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default async function HomePage() {
  const jar = await cookies();
  const signedIn = jar
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token") && cookie.value.length > 0);

  return (
    <>
      <script
        type="application/ld+json"
        // Static, trusted content; `<` is escaped so the JSON cannot close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <LandingExperience signedIn={signedIn} />
    </>
  );
}
