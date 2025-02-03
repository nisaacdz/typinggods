import { NextFunction, Request, Response } from "express"
import rateLimit from "express-rate-limit"
import AppError from "../extensions/libs/app-error"

export const restrictTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req?.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      )
    }

    next()
  }
}

export const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  limit: 7,
  standardHeaders: "draft-7",
  legacyHeaders: false,
})

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: (res: Response) => {
    return res.status(429).json({
      message: "Too many requests",
    })
  },
})
