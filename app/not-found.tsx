"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const locale = usePathname().split("/")[1] === "en" ? "en" : "ar";
  const english = locale === "en";
  return <main className="standalone-state"><div className="standalone-state__code">404</div><h1>{english ? "Page not found" : "الصفحة غير موجودة"}</h1><p>{english ? "The requested page is unavailable or has moved." : "الرابط المطلوب غير متاح أو تم نقله."}</p><Link className="button button--primary button--md" href={`/${locale}`}>{english ? "Back to dashboard" : "العودة إلى لوحة التحكم"}</Link></main>;
}
