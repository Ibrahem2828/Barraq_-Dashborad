import { NextResponse } from "next/server";
import { backendJson, logBackendFailure } from "@/lib/api/backend-http";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON", code: "validation_error" }, { status: 400 });
  }

  const email =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).email === "string"
      ? String((body as Record<string, unknown>).email).trim().toLowerCase()
      : "";
  if (!email) {
    return NextResponse.json({ success: false, message: "Email is required", code: "validation_error" }, { status: 400 });
  }

  if (!isApiBindingEnabled()) {
    return NextResponse.json(bindingDisabledPayload(), { status: 503 });
  }

  const startedAt = Date.now();
  try {
    const upstream = await backendJson("auth/password-reset/", {
      method: "POST",
      data: { email }
    });
    const payload = (upstream.data && typeof upstream.data === "object"
      ? upstream.data
      : { success: false, message: "Password reset request failed" });
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    const { status } = logBackendFailure("auth/password-reset", error, startedAt);
    return NextResponse.json(
      { success: false, message: "Unable to reach authentication service", code: "server_error" },
      { status }
    );
  }
}
