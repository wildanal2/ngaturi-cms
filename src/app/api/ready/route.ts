import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 3000;

async function checkDependencies(): Promise<void> {
  await Promise.all([
    getDb().execute(sql`select 1`),
    redis.get("health:readiness"),
  ]);
}

export async function GET() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      checkDependencies(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error("Readiness timed out")),
          TIMEOUT_MS,
        );
      }),
    ]);
    return NextResponse.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
