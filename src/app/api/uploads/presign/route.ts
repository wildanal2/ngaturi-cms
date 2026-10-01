import { NextResponse } from "next/server";

/** Direct uploads lack verified completion, decoded-image validation and size enforcement. */
export async function POST() {
  return NextResponse.json(
    { error: "Upload langsung tidak tersedia. Gunakan /api/uploads." },
    { status: 403 },
  );
}
