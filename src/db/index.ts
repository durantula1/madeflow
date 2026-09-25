import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnvironment } from "@/lib/env/server";
import * as schema from "@/db/schema";

const globalDatabase = globalThis as unknown as {
  paktoSql?: ReturnType<typeof postgres>;
  paktoDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function getSqlClient() {
  if (!globalDatabase.paktoSql) {
    globalDatabase.paktoSql = postgres(getServerEnvironment().DATABASE_URL, {
      prepare: false,
      max: process.env.NODE_ENV === "production" ? 4 : 1,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require",
    });
  }

  return globalDatabase.paktoSql;
}

export function getDatabase() {
  globalDatabase.paktoDb ??= drizzle(getSqlClient(), { schema });
  return globalDatabase.paktoDb;
}
