import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      version:
        process.env.VERCEL_GIT_COMMIT_SHA ??
        process.env.VERCEL_GIT_COMMIT_REF ??
        Date.now().toString(),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        Surrogate-Control": "no-store",
      },
    }
  );
}
