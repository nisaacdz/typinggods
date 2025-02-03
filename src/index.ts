import App from "./App"
import { ENVIRONMENTS } from "./config/app.config"
import Env from "./config/app.keys"
import { logger } from "./extensions/helpers/logger.helper"
import validateEnvironmentVariables from "./extensions/utils/env-validator"

validateEnvironmentVariables()
// connectToDB()
//   .then(() => {
//     App.listen(Env.PORT, () => {
//       if (Env.ENVIRONMENT === ENVIRONMENTS.DEV)
//         logger.info(
//           `Express is listening on http://localhost:${Env.PORT}${Env.API_PATH}`
//         )
//     })
//   })
//   .catch(() => logger.error(`DB Connection not successful`))

App.listen(Env.PORT, () => {
  if (Env.ENVIRONMENT === ENVIRONMENTS.DEV) {
    logger.info(
      `Express is listening on http://localhost:${Env.PORT}${Env.API_PATH}`
    )
  }
})

process.on("unhandledRejection", (reason: string, p: Promise<any>) => {
  logger.error("Unhandled Rejection at:\n", p)
  console.log("\n")
  logger.error("Reason:\n", reason)
  //Track error with error logger

  process.exit(1)
  //Restart with pm2 in production
})

process.on("uncaughtException", (error: Error) => {
  logger.error(`Uncaught exception:`)
  console.log("\n")
  logger.error(error)
  //Track error with error logger

  process.exit(1)
  //Restart with pm2 in production
})
