import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";

export async function GET() {
  const store = await cookies();
  const authenticated = Boolean(store.get(ACCESS_COOKIE)?.value || store.get(REFRESH_COOKIE)?.value);
  return NextResponse.json({ success: true, data: { authenticated } });
}
