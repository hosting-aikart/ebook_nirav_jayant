// npm run db:migrate — applies new files in backend/db/migrations.
// (The server also does this when it starts.)
import { closeDb, migrate } from "./db.js";

try {
  await migrate();
  console.log("Database is up to date.");
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await closeDb();
}
