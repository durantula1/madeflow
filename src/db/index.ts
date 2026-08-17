import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnvironment } from "@/lib/env/server";
import * as schema from "@/db/schema";

const globalDatabase = globalThis as unknown as {
  madeflowSql?: ReturnType<typeof postgres>;
  madeflowDb?: ReturnType<typeof drizzle<typeof schema>>;
};

function getSqlClient() {
  if (!globalDatabase.madeflowSql) {
    globalDatabase.madeflowSql = postgres(getServerEnvironment().DATABASE_URL, {
      prepare: false,
      max: process.env.NODE_ENV === "production" ? 4 : 1,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require",
    });
  }

  return globalDatabase.madeflowSql;
}

export function getDatabase() {
  globalDatabase.madeflowDb ??= drizzle(getSqlClient(), { schema });
  return globalDatabase.madeflowDb;
}
