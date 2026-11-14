import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "mk_session";

/**
 * محافظت از صفحات: کاربر مهمان به /login و کاربر واردشده به صفحه اصلی هدایت می‌شود.
 * اعتبار خود نشست در APIها بررسی می‌شود.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isAuthPage = pathname === "/login";

  if (!hasSession && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/invoices", "/invoices/:path*"],
};
