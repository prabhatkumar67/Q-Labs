import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const VALID_CREDENTIALS = {
  email: "admin@sandbox.store",
  password: "admin123",
};

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (
    email === VALID_CREDENTIALS.email &&
    password === VALID_CREDENTIALS.password
  ) {
    const cookieStore = await cookies();
    cookieStore.set("admin_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { success: false, error: "Invalid email or password" },
    { status: 401 }
  );
}
