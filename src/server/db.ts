/**
 * Thin database layer over plain parameterized SQL.
 *
 * - DATABASE_URL set  -> managed Postgres via `postgres` (staging/production)
 * - DATABASE_URL empty -> embedded PGlite (real Postgres compiled to WASM) for local dev and tests
 *
 * Same SQL dialect in both, so tests exercise the real constraints.
 */
import { migrations } from "./migrations/index.ts";

export type Row = Record<string, unknown>;
export interface Queryable {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}
export interface Db extends Queryable {
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

async function createPglite(dataDir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  if (!dataDir.startsWith("memory://")) {
    const fs = await import("node:fs");
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  const wrap = (q: { query: (s: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Queryable => ({
    async query<T>(sql: string, params: unknown[] = []) {
      return (await q.query(sql, params)).rows as T[];
    },
  });
  return {
    ...wrap(pg),
    tx: (fn) => pg.transaction((t) => fn(wrap(t))),
    close: () => pg.close(),
  };
}

async function createPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  const sql = postgres(url, { max: 5, prepare: false, onnotice: () => {} });
  type Unsafe = { unsafe: (s: string, p?: never[]) => Promise<unknown[]> };
  const wrap = (q: Unsafe): Queryable => ({
    async query<T>(text: string, params: unknown[] = []) {
      return (await q.unsafe(text, params as never[])) as T[];
    },
  });
  return {
    ...wrap(sql as unknown as Unsafe),
    tx: (fn) => sql.begin((t) => fn(wrap(t as unknown as Unsafe))) as never,
    close: () => sql.end(),
  };
}

export async function migrate(db: Db): Promise<string[]> {
  // PGlite needs multi-statement exec; both drivers accept multiple statements via simple query
  // when no params are passed, so we run each migration as one unparameterized batch.
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const applied = new Set((await db.query<{ name: string }>(`SELECT name FROM schema_migrations`)).map((r) => r.name));
  const ran: string[] = [];
  for (const m of migrations) {
    if (applied.has(m.name)) continue;
    await db.tx(async (q) => {
      for (const stmt of splitSql(m.sql)) await q.query(stmt);
      await q.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [m.name]);
    });
    ran.push(m.name);
  }
  return ran;
}

/** Split on semicolons at end of line. Migrations avoid semicolons inside literals. */
export function splitSql(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
}

const g = globalThis as unknown as { __fhcDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__fhcDb) {
    g.__fhcDb = (async () => {
      const url = process.env.DATABASE_URL;
      const db = url ? await createPostgres(url) : await createPglite(process.env.PGLITE_DIR || ".data/pglite");
      await migrate(db);
      return db;
    })();
    g.__fhcDb.catch(() => {
      g.__fhcDb = undefined; // allow retry after a transient failure
    });
  }
  return g.__fhcDb;
}

/** For tests: swap in a fresh in-memory database. */
export async function resetDbForTests(): Promise<Db> {
  if (g.__fhcDb) {
    try {
      await (await g.__fhcDb).close();
    } catch {}
  }
  g.__fhcDb = undefined;
  process.env.PGLITE_DIR = "memory://";
  delete process.env.DATABASE_URL;
  return getDb();
}
