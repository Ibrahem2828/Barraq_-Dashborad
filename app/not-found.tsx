import Link from "next/link";

export default function NotFound() {
  return <main className="standalone-state"><div className="standalone-state__code">404</div><h1>الصفحة غير موجودة</h1><p>الرابط المطلوب غير متاح أو تم نقله.</p><Link className="button button--primary button--md" href="/ar">العودة إلى لوحة التحكم</Link></main>;
}
