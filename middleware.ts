import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, LOCALE_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

const locales = ["ar", "en"] as const;
const defaultLocale: (typeof locales)[number] = locales.includes(
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE as (typeof locales)[number]
)
  ? (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as (typeof locales)[number])
  : "ar";
const cookieSecure = (process.env.AUTH_COOKIE_SECURE ?? "true").toLowerCase() === "true";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) return NextResponse.next();

  const segment = pathname.split("/")[1];
  if (!locales.includes(segment as (typeof locales)[number])) {
    const locale = request.cookies.get(LOCALE_COOKIE)?.value === "en" ? "en" : defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = segment as "ar" | "en";
  const isLogin = pathname === `/${locale}/login`;
  const hasSession = Boolean(request.cookies.get(ACCESS_COOKIE)?.value || request.cookies.get(REFRESH_COOKIE)?.value);
  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  const response = NextResponse.next();
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: cookieSecure
  });
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
