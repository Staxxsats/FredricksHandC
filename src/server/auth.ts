import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import type { Queryable } from "./db.ts";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export type Role = "owner_admin" | "dispatcher" | "technician" | "read_only_accounting";
export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const SESSION_COOKIE = "fhc_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

export async function hashPassword(pw: string): Promise<string> {
  if (pw.length < 12) throw new Error("Password must be at least 12 characters");
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 32, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(pw, Buffer.from(saltB64, "base64"), expected.length, SCRYPT);
  return timingSafeEqual(key, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// A fixed dummy hash so unknown emails cost the same time as known ones.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function authenticate(db: Queryable, email: string, password: string): Promise<StaffUser | null> {
  const rows = await db.query<StaffUser & { password_hash: string; active: boolean }>(
    `SELECT id, email, name, role, password_hash, active FROM users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  const u = rows[0];
  const ok = await verifyPassword(password, u?.password_hash ?? DUMMY_HASH);
  if (!u || !ok || !u.active) return null;
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

export async function createSession(db: Queryable, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`, [sha256(token), userId, expiresAt]);
  await db.query(`DELETE FROM sessions WHERE expires_at < now()`);
  return { token, expiresAt };
}

export async function userForToken(db: Queryable, token: string | undefined): Promise<StaffUser | null> {
  if (!token) return null;
  const rows = await db.query<StaffUser>(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active`,
    [sha256(token)],
  );
  return rows[0] ?? null;
}

export async function destroySession(db: Queryable, token: string | undefined) {
  if (token) await db.query(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)]);
}

export async function createUser(db: Queryable, u: { email: string; name: string; role: Role; password: string }): Promise<StaffUser> {
  const hash = await hashPassword(u.password);
  const rows = await db.query<StaffUser>(
    `INSERT INTO users (email, name, role, password_hash) VALUES (lower($1), $2, $3, $4) RETURNING id, email, name, role`,
    [u.email.trim(), u.name, u.role, hash],
  );
  return rows[0];
}

/* ---------------- Permissions ----------------
 * Server-side checks. The UI hiding a button is never the authorization.
 */
export type Permission = "leads:read_all" | "leads:update" | "leads:assign" | "settings:manage" | "users:manage";

const ROLE_PERMS: Record<Role, Permission[]> = {
  owner_admin: ["leads:read_all", "leads:update", "leads:assign", "settings:manage", "users:manage"],
  dispatcher: ["leads:read_all", "leads:update", "leads:assign"],
  technician: [],
  read_only_accounting: [],
};

export function can(user: StaffUser | null, perm: Permission): boolean {
  return !!user && ROLE_PERMS[user.role].includes(perm);
}

/** Object-level check (prevents IDOR): technicians only see leads assigned to them. */
export function canViewLead(user: StaffUser | null, lead: { assigned_to: string | null }): boolean {
  if (!user) return false;
  if (can(user, "leads:read_all")) return true;
  return user.role === "technician" && lead.assigned_to === user.id;
}
