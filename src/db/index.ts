import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import Env from "../config/app.keys"
import * as schema from "./schema/db.schema"

if (
  !Env.DATABASE_HOST ||
  !Env.DATABASE_DB ||
  !Env.DATABASE_PASSWORD ||
  !Env.DATABASE_URL
) {
  throw new Error("Database credentials missing.")
}

const pool = new Pool({
  // port: 5432,
  // host: Env.POSTGRES_HOST,
  // user: Env.POSTGRES_USER,
  // password: Env.POSTGRES_PASSWORD,
  // database: Env.POSTGRES_DB,
  connectionString: Env.DATABASE_URL + "?sslmode=require",
  // connectionString: Env.POSTGRES_URL,
})

const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema })
export default db
