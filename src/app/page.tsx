import { cookies } from "next/headers";

import "./marketing.css";

import { LandingExperience } from "@/components/marketing/landing-experience";

export default async function HomePage() {
  const jar = await cookies();
  const signedIn = jar
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token") && cookie.value.length > 0);

  return <LandingExperience signedIn={signedIn} />;
}
