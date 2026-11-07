import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { userForToken, SESSION_COOKIE, type StaffUser } from "./auth";

export async function getCurrentUser(): Promise<StaffUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForToken(await getDb(), token);
}

export async function requireUser(): Promise<StaffUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/admin/login");
  return u;
}
