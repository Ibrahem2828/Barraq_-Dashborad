import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { backendJson } from "@/lib/api/backend-http";
import { isApiBindingEnabled } from "@/lib/api/binding";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";
import { clearAuthCookies, validateMutationCsrf } from "@/lib/auth/server";

export async function POST(request: Request) {
  if (!(await validateMutationCsrf(request))) return NextResponse.json({ success: false, message: "CSRF validation failed" }, { status: 403 });
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  // Binding paused: clear local cookies only.
  if (refresh && isApiBindingEnabled()) {
    try {
      await backendJson("auth/logout/", {
        method: "POST",
        data: { refresh }
      });
    } catch {
      // Ignore upstream logout failures; local cookies still clear.
    }
  }
  await clearAuthCookies();
  return NextResponse.json({ success: true, data: { authenticated: false } });
}
