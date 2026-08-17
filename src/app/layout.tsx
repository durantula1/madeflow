import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "MadeFlow — от спецификация до сервиз",
    template: "%s · MadeFlow",
  },
  description:
    "Единно място за спецификации, оферти, клиентско одобрение, монтаж и гаранции за производители по поръчка.",
  applicationName: "MadeFlow",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "MadeFlow",
    description: "Спокойният начин да управляваш всяка поръчка по изработка.",
    locale: "bg_BG",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bg"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
