import joi from "joi"
import { ENVIRONMENTS } from "../../config/app.config"
import Env, { IEnv } from "../../config/app.keys"

function validateEnvironmentVariables() {
  try {
    const EnvSchema: joi.ObjectSchema<
      Pick<
        IEnv,
        | "ENVIRONMENT"
        | "ALLOWED_ORIGINS"
        | "PORT"
        | "API_VERSION"
        | "API_PATH"
        | "DATABASE_DB"
        | "DATABASE_HOST"
        | "DATABASE_PASSWORD"
        | "DATABASE_URL"
        | "DATABASE_USER"
      >
    > = joi.object({
      ENVIRONMENT: joi
        .string()
        .valid(...Object.values(ENVIRONMENTS))
        .required(),
      PORT: joi.number().required(),
      ALLOWED_ORIGINS: joi.array().items(joi.string()).min(1).required(),
      API_VERSION: joi.string().required(),
      API_PATH: joi.string().required(),
      DATABASE_DB: joi.string(),
      DATABASE_HOST: joi.string(),
      DATABASE_PASSWORD: joi.string(),
      DATABASE_URL: joi.string(),
      DATABASE_USER: joi.string(),
    })
    const response = EnvSchema.validate(Env)
    if (response.error)
      throw new Error(
        `Env validation error: ${response.error.details
          .map((x) => x.message)
          .join(", ")}`
      )
  } catch (error) {
    throw error
  }
}

export default validateEnvironmentVariables
