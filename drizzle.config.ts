import { defineConfig } from "drizzle-kit";

const migrationUrl =
  process.env.DATABASE_MIGRATION_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});
