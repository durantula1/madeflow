import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "MadeFlow — допълнителната работа, договорена навреме",
    template: "%s · MadeFlow",
  },
  description:
    "Документирай промяната на обекта за под минута и получи ясно клиентско одобрение без регистрация.",
  applicationName: "MadeFlow",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "MadeFlow",
    description: "Допълнителната работа, договорена навреме.",
    locale: "bg_BG",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bg"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
