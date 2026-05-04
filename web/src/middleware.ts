import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // /register?ref=xxx → /?ref=xxx&login=1
  if (pathname === "/register") {
    const ref = searchParams.get("ref");
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    if (ref) {
      url.searchParams.set("ref", ref);
    }
    url.searchParams.set("login", "1");
    return NextResponse.redirect(url);
  }

  // /referral/CODE → /?ref=CODE&login=1
  const referralMatch = pathname.match(/^\/referral\/([^/]+)$/);
  if (referralMatch && referralMatch[1]) {
    const code = referralMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("ref", code);
    url.searchParams.set("login", "1");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/register", "/referral/:code*"],
};
