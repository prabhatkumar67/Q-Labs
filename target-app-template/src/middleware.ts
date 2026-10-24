import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Demo: when DEMO_BUG=1, /cart returns 404 so QA can show a real failure. "Fix" by re-uploading without this env (or set DEMO_BUG=0).
  if (request.nextUrl.pathname === "/cart" && process.env.DEMO_BUG === "1") {
    return new NextResponse(null, { status: 404 });
  }

  const session = request.cookies.get("admin_session");

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!session || session.value !== "authenticated") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cart", "/admin/:path*"],
};
