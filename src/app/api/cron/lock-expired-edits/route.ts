import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { lockExpiredEdits } from "@/lib/invitation/cron";

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const locked = await lockExpiredEdits();
  return NextResponse.json({ locked });
}
