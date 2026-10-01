// Applies pending SQL files in supabase/migrations, in order, each in its own
// transaction. Applied versions are recorded in the same table the Supabase
// CLI uses, so `supabase db push` stays compatible.
// Usage: npm run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const DIR = "supabase/migrations";
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();

try {
  await db.query(`
    create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (
      version text primary key,
      statements text[],
      name text
    );
  `);
  const { rows } = await db.query<{ version: string }>("select version from supabase_migrations.schema_migrations");
  const applied = new Set(rows.map((r) => r.version));

  const files = readdirSync(DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  let count = 0;
  for (const file of files) {
    const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
    if (applied.has(version)) continue;
    const sql = readFileSync(path.join(DIR, file), "utf8");
    process.stdout.write(`Applying ${file}… `);
    await db.query("begin");
    try {
      await db.query(sql);
      await db.query("insert into supabase_migrations.schema_migrations (version, name, statements) values ($1, $2, $3)", [
        version,
        rest.join("_"),
        [sql],
      ]);
      await db.query("commit");
      console.log("ok");
      count++;
    } catch (e) {
      await db.query("rollback");
      console.log("failed");
      throw e;
    }
  }
  console.log(count ? `${count} migration(s) applied.` : "Database is up to date.");
} finally {
  await db.end();
}
