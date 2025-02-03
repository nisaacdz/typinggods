import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"
import Env from "../config/app.keys"
import { logger } from "../extensions/helpers/logger.helper"

async function main() {
  console.log(Env.DATABASE_URL)
  const pool = new Pool({
    connectionString: Env.DATABASE_URL,
  })
  const db: NodePgDatabase = drizzle(pool)
  logger.info("[Migrate] migration has started ....")
  await migrate(db, { migrationsFolder: "drizzle" })
  logger.info("[Migrate] migration ended")
  await pool.end()
}

main().catch((err) => {
  logger.error(err)
})
