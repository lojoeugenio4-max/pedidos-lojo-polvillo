import { NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "polvillo_admin_session";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });

  return response;
}
