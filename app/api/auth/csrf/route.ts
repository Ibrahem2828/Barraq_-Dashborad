import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CSRF_COOKIE } from "@/lib/auth/cookies";
import { cookieOptions } from "@/lib/auth/server";

export async function GET() {
  const store = await cookies();
  let token = store.get(CSRF_COOKIE)?.value;
  if (!token) {
    token = crypto.randomUUID();
    store.set(CSRF_COOKIE, token, { ...cookieOptions(false), maxAge: 60 * 60 * 24 * 30 });
  }
  return NextResponse.json({ success: true, data: { token } });
}
