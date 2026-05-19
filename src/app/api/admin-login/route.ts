import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "polvillo_admin_session";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminPassword || !sessionSecret) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Faltan ADMIN_PASSWORD o ADMIN_SESSION_SECRET en las variables de entorno.",
      },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json(
      {
        ok: false,
        message: "Contraseña incorrecta.",
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
  });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: sessionSecret,
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
