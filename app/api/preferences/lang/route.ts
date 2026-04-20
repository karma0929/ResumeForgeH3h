import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isInternalPath, normalizeUiLanguage, UI_LANGUAGE_COOKIE } from "@/lib/i18n";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const value = normalizeUiLanguage(searchParams.get("value"));
  const returnToParam = searchParams.get("returnTo");
  const returnTo = returnToParam && isInternalPath(returnToParam) ? returnToParam : "/";
  const cookieStore = await cookies();

  cookieStore.set(UI_LANGUAGE_COOKIE, value, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
    httpOnly: false,
  });

  return NextResponse.redirect(new URL(returnTo, request.url));
}
