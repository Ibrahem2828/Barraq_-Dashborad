import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cairo } from "next/font/google";
import { ThemeScript } from "@/components/providers/ThemeScript";
import { LOCALE_HEADER } from "@/lib/auth/cookies";
import "./globals.css";

const baraqFont = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-baraq",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"]
});

export const metadata: Metadata = {
  title: { default: "لوحة تحكم برّاق", template: "%s | برّاق" },
  description: "مركز القيادة والإدارة لمنصة برّاق التعليمية",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/app_icon_round.png" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Middleware resolved this already; the root layout is above [locale] and
  // has no segment of its own to read.
  const locale = (await headers()).get(LOCALE_HEADER) === "en" ? "en" : "ar";

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={baraqFont.variable}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className={baraqFont.className}>{children}</body>
    </html>
  );
}
