import { NextResponse } from "next/server";
import { getDb } from "@/server/db";
import { submitServiceRequest } from "@/server/intake";
import { processOutbox } from "@/integrations";
import { hashIp, isSameOrigin } from "@/lib/ip";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ ok: false, code: "rejected" }, { status: 403 });
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 20_000) return NextResponse.json({ ok: false, code: "rejected" }, { status: 413 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid", fieldErrors: { _: "Malformed request" } }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await submitServiceRequest(db, body, { ipHash: hashIp(req.headers) });
    if (result.ok) {
      // Best-effort notification processing; the lead is already durably saved.
      processOutbox(db).catch((err) => logger.error("outbox.inline_failed", { err }));
      return NextResponse.json({ ok: true, ref: result.ref, safetyFlag: result.safetyFlag }, { status: result.replay ? 200 : 201 });
    }
    const status = { invalid: 422, out_of_area: 422, category_unavailable: 422, rate_limited: 429, rejected: 400 }[result.code];
    return NextResponse.json(result, { status });
  } catch (err) {
    logger.error("api.requests.error", { err });
    return NextResponse.json({ ok: false, code: "server_error" }, { status: 503 });
  }
}
