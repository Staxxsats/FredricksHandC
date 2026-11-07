import { NextResponse } from "next/server";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.query("SELECT 1");
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
