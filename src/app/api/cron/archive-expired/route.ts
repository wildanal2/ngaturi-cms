import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { archiveExpired } from "@/lib/invitation/cron";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const archived = await archiveExpired();
  return NextResponse.json({ archived });
}
