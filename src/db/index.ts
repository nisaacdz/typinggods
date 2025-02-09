import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { config } from "dotenv";

config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db: NodePgDatabase = drizzle(pool);
