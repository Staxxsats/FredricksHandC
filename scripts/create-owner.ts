/**
 * Creates the first owner_admin login. There is no public sign-up.
 *   OWNER_EMAIL=you@yourdomain OWNER_PASSWORD='long passphrase' npm run db:create-owner
 */
import { getDb } from "../src/server/db.ts";
import { createUser } from "../src/server/auth.ts";

const email = process.env.OWNER_EMAIL;
const password = process.env.OWNER_PASSWORD;
const name = process.env.OWNER_NAME || "Owner";
if (!email || !password) {
  console.error("Set OWNER_EMAIL and OWNER_PASSWORD (12+ chars).");
  process.exit(1);
}
const db = await getDb();
const exists = await db.query(`SELECT 1 FROM users WHERE lower(email) = lower($1)`, [email]);
if (exists.length) {
  console.log("User already exists; nothing changed.");
} else {
  const u = await createUser(db, { email, name, role: "owner_admin", password });
  console.log(`Created owner_admin ${u.email}`);
}
await db.close();
