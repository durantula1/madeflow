import type { Metadata } from "next";

import { LandingExperience } from "@/components/marketing/landing-experience";

import "./marketing.css";

export const metadata: Metadata = {
  title: "MadeFlow — всяка поръчка има памет",
  description:
    "Красив и ясен работен поток за спецификации, версии, клиентско одобрение, производство, монтаж и сервиз.",
};

export default function HomePage() {
  return <LandingExperience />;
}
