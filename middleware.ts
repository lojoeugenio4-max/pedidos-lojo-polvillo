import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "polvillo_admin_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";

  if (!isAdminRoute || isLoginPage) {
    return NextResponse.next();
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!sessionSecret) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("error", "missing_secret");
    return NextResponse.redirect(loginUrl);
  }

  const cookieValue = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (cookieValue !== sessionSecret) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
