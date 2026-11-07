import { getDb } from "../src/server/db.ts";

const db = await getDb(); // getDb() applies pending migrations
const rows = await db.query<{ name: string }>(`SELECT name FROM schema_migrations ORDER BY name`);
console.log("Migrations applied:", rows.map((r) => r.name).join(", "));
await db.close();
