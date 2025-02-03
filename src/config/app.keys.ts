import "dotenv/config"

export interface IEnv {
  PORT: number
  API_VERSION: string
  API_PATH: string
  ENVIRONMENT: string
  ALLOWED_ORIGINS: string[]
  DATABASE_URL: string
  DATABASE_HOST: string
  DATABASE_PASSWORD: string
  DATABASE_USER: string
  DATABASE_DB: string
}

const Env: IEnv = {
  PORT: Number(process.env.PORT),
  API_VERSION: process.env.API_VERSION as string,
  API_PATH: "/api/" + process.env.API_VERSION,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(",") as string[],
  ENVIRONMENT: process.env.ENVIRONMENT as string,
  DATABASE_DB: process.env.DATABASE_DB as string,
  DATABASE_HOST: process.env.DATABASE_HOST as string,
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  DATABASE_USER: process.env.DATABASE_USER as string,
}

export default Env
