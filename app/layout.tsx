import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { ThemeScript } from "@/components/providers/ThemeScript";
import "./globals.css";

const baraqFont = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-baraq",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"]
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "لوحة تحكم برّاق";

export const metadata: Metadata = {
  title: { default: appName, template: `%s | برّاق` },
  description: "مركز القيادة والإدارة لمنصة برّاق التعليمية",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/app_icon_round.png" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" className={baraqFont.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={baraqFont.className}>{children}</body>
    </html>
  );
}
