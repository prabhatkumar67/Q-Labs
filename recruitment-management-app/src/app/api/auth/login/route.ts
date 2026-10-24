import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidCredential } from "@/lib/auth";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body?.email === "string" ? body.email : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (isValidCredential("admin", email, password)) {
    const cookieStore = await cookies();
    cookieStore.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({ success: true });
  }

  await wait(400);

  return NextResponse.json(
    { success: false, error: "Invalid email or password" },
    { status: 401 },
  );
}
