interface IResponseMessage {
  response_code: number
  message: string
}

interface IJwtPayload {
  data: string
  iat: number
  exp: number
}

export { IJwtPayload, IResponseMessage }
