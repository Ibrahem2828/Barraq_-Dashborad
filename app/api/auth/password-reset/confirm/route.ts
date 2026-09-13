import { NextResponse } from "next/server";
import { backendJson } from "@/lib/api/backend-http";
import { bindingDisabledPayload, isApiBindingEnabled } from "@/lib/api/binding";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON", code: "validation_error" }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const uid = typeof data.uid === "string" ? data.uid.trim() : "";
  const token = typeof data.token === "string" ? data.token.trim() : "";
  const newPassword = typeof data.new_password === "string" ? data.new_password : "";

  if (!uid || !token || !newPassword) {
    return NextResponse.json(
      { success: false, message: "uid, token and new_password are required", code: "validation_error" },
      { status: 400 }
    );
  }
  if (newPassword.length < 10) {
    return NextResponse.json(
      { success: false, message: "Password must be at least 10 characters", code: "validation_error" },
      { status: 400 }
    );
  }

  if (!isApiBindingEnabled()) {
    return NextResponse.json(bindingDisabledPayload(), { status: 503 });
  }

  try {
    const upstream = await backendJson("auth/password-reset/confirm/", {
      method: "POST",
      data: { uid, token, new_password: newPassword }
    });
    const payload = (upstream.data && typeof upstream.data === "object"
      ? upstream.data
      : { success: false, message: "Password reset confirmation failed" });
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to reach authentication service", code: "server_error" },
      { status: 503 }
    );
  }
}
