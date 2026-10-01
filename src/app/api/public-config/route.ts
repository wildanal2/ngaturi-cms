import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { turnstileSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
