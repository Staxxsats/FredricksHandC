import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { isZipEligible, hitRateLimit } from "@/server/intake";
import { hashIp } from "@/lib/ip";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const zip = new URL(req.url).searchParams.get("zip") ?? "";
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ error: "invalid_zip" }, { status: 400 });
  const db = await getDb();
  if (await hitRateLimit(db, `zip:${hashIp(req.headers)}`, 60, 10 * 60 * 1000)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  return NextResponse.json({ eligible: await isZipEligible(db, zip) }, { headers: { "Cache-Control": "no-store" } });
}
