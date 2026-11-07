/**
 * LOCAL DEVELOPMENT ONLY. Adds demo ZIPs and demo staff logins so the request flow and
 * inbox can be exercised. No real customer data. Refuses to run against DATABASE_URL.
 */
import { getDb } from "../src/server/db.ts";
import { createUser } from "../src/server/auth.ts";

if (process.env.DATABASE_URL || process.env.NODE_ENV === "production") {
  console.error("seed-dev refuses to run against a configured DATABASE_URL / production.");
  process.exit(1);
}
const db = await getDb();
for (const [zip, label] of [["30078", "Snellville (DEMO: pending owner approval)"], ["30039", "Snellville (DEMO: pending owner approval)"]]) {
  await db.query(`INSERT INTO service_zips (zip, label) VALUES ($1,$2) ON CONFLICT (zip) DO NOTHING`, [zip, label]);
}
const pw = process.env.DEV_STAFF_PASSWORD || "dev-password-change-me";
for (const u of [
  { email: "owner@example.test", name: "Demo Owner", role: "owner_admin" as const },
  { email: "dispatch@example.test", name: "Demo Dispatcher", role: "dispatcher" as const },
  { email: "tech@example.test", name: "Demo Technician", role: "technician" as const },
]) {
  const exists = await db.query(`SELECT 1 FROM users WHERE email = $1`, [u.email]);
  if (!exists.length) await createUser(db, { ...u, password: pw });
}
console.log(`Seeded demo ZIPs 30078, 30039 and demo staff (password: ${pw}).`);
await db.close();
