import { NextFunction, Request, Response, Router } from "express"
import joi from "joi"
import { joiValidatorOptions } from "../config/app.config"
import { CLIENT_ERROR } from "../extensions/utils/error-response-message.utils"
import BaseRouterMiddleware from "./base-middleware/base-router.middleware"

class AppValidator extends BaseRouterMiddleware {
  constructor(appRouter: Router) {
    super(appRouter)
  }

  // public validateUserSignup = async (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ) => {
  //   try {
  //     const UserSignupSchema: joi.ObjectSchema<IUserSignUp> = joi.object({
  //       firstName: joi.string().max(256).required(),
  //       lastName: joi.string().max(256).required(),
  //       email: joi.string().email().required(),
  //       password: joi.string().required(),
  //       phone: joi.string().max(50),
  //     })

  //     await UserSignupSchema.validateAsync(req.body, joiValidatorOptions)
  //     const existingUser = await db.query.Users.findFirst({
  //       where(Users, { eq }) {
  //         return eq(Users.email, req.body.email)
  //       },
  //     })
  //     if (existingUser) {
  //       const error = new Error("A user with this email already exists")
  //       return this.sendErrorResponse(res, error, DUPLICATE_EMAIL, 422)
  //     }
  //     next()
  //   } catch (error: any) {
  //     return this.sendErrorResponse(
  //       res,
  //       error,
  //       badRequestError(error.message),
  //       422
  //     )
  //   }
  // }

  public validateOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const OrganizationCreateSchema = joi.object({
        name: joi.string().required(),
        description: joi.string().required(),
      })
      await OrganizationCreateSchema.validateAsync(
        req.body,
        joiValidatorOptions
      )
      next()
    } catch (error: any) {
      this.sendErrorResponse(res, new Error("Bad Request"), CLIENT_ERROR, 422)
    }
  }
}

export default AppValidator
