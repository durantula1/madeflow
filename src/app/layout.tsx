import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { productDefinition } from "@/lib/seo/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Pakto — допълнителната работа, договорена навреме",
    template: "%s · Pakto",
  },
  description: productDefinition,
  applicationName: "Pakto",
  openGraph: {
    title: "Pakto",
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
      {/* Kept out of `metadata`: Next swaps its head tags on every navigation, and a re-added icon link makes the tab icon blink. */}
      <head>
        <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
