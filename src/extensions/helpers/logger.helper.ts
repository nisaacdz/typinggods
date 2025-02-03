const info = (...params: any) => {
  if (process.env.NODE_ENV === "test") return

  console.info(...params)
}

const error = (...params: any) => {
  if (process.env.NODE_ENV === "test") return

  console.error(...params)
}

export const logger = {
  info,
  error,
}
