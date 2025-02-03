import { Request, Response } from "express"
import AppError from "../libs/app-error"

interface ErrorInterface {
  statusCode: number
  status: string
  message: string
  stack: Error["stack"]
  isOperational?: boolean
}

const sendErrorDev = (err: ErrorInterface, _req: Request, res: Response) => {
  const statusCode = err.statusCode || 500
  const status = err.status || "fail"

  res.status(statusCode).json({
    status,
    error: err,
    message: err.message,
    stackTrace: err.stack,
  })
}

const sendErrorProd = (err: ErrorInterface, req: Request, res: Response) => {
  // trusted error, send it to the client
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  })
}

const handleValidationError = (err: any) => {
  const errData = Object.values(err.errors).map((el: any) => {
    return el.message
  })
  const message = errData.join("...,")
  return new AppError(message, 404)
}

export const errorController = (err: any, req: Request, res: Response) => {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    sendErrorDev(err, req, res)
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err }
    if (err.name === "ValidationError") {
      error = handleValidationError(err)
    }

    sendErrorProd(error, req, res)
  }
}
