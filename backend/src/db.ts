import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { backendDir, config } from "./config.js";
import { HttpError } from "./http.js";

// pg already treats sslmode=require (Neon's default) as full certificate verification and
// warns that this will change in pg v9. Asking for verify-full keeps today's stricter checks.
const connectionString = config.databaseUrl.replace(/([?&]sslmode=)(require|prefer|verify-ca)\b/, "$1verify-full");

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      max: 5,
      // Close idle connections before Neon puts the database to sleep (after 5 minutes).
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 20_000,
    })
  : null;

// A dropped idle connection must not crash the server; the next query opens a new one.
pool?.on("error", (err) => console.warn("Database connection closed:", err.message));

export const dbConfigured = Boolean(pool);

export function db(): pg.Pool {
  if (!pool) throw new HttpError(503, "The store database isn't set up yet. Add DATABASE_URL to backend/.env.");
  return pool;
}

export async function closeDb() {
  await pool?.end();
}

/**
 * Applies the SQL files in backend/db/migrations that haven't run yet, in name order,
 * each in its own transaction. Safe to run from several processes at once.
 */
export async function migrate(log: (line: string) => void = console.log) {
  const dir = path.join(backendDir, "db", "migrations");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  const pool = db();
  await pool.query(
    "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await pool.query<{ version: string }>("select version from schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    if (applied.has(version)) continue;

    const client = await pool.connect();
    try {
      await client.query("begin");
      // Transaction-scoped lock: works through Neon's connection pooler, unlike a session lock.
      await client.query("select pg_advisory_xact_lock(727274)");
      const done = await client.query("select 1 from schema_migrations where version = $1", [version]);
      if (done.rowCount) {
        await client.query("rollback"); // another process applied it meanwhile
        continue;
      }
      await client.query(await fs.readFile(path.join(dir, file), "utf8"));
      await client.query("insert into schema_migrations (version) values ($1)", [version]);
      await client.query("commit");
      log(`  applied migration ${version}`);
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }
}
