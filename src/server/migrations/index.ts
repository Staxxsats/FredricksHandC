import m001 from "./001_initial.ts";
import m002 from "./002_seed_catalog.ts";

/** Ordered, append-only. Never edit a migration that has run in production; add a new one. */
export const migrations: { name: string; sql: string }[] = [
  { name: "001_initial", sql: m001 },
  { name: "002_seed_catalog", sql: m002 },
];
