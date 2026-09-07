import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { backendFetch, clearAuthCookies, validateMutationCsrf } from "@/lib/auth/server";

export async function POST(request: Request) {
  if (!(await validateMutationCsrf(request))) return NextResponse.json({ success: false, message: "CSRF validation failed" }, { status: 403 });
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  const access = store.get(ACCESS_COOKIE)?.value;
  // Binding paused: clear local cookies only.
  if (refresh && isApiBindingEnabled()) {
    await backendFetch("auth/logout/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {})
      },
      body: JSON.stringify({ refresh })
    }).catch(() => null);
  }
  await clearAuthCookies();
  return NextResponse.json({ success: true, data: { authenticated: false } });
}
