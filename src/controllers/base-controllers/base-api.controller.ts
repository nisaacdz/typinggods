import express, { Router } from "express"
import RequestUtils from "../../extensions/utils/request.utils"
import AppValidator from "../../middleware/app-validator.middleware"
import BaseResponseHandler from "./base-response-handler.controller"

abstract class BaseApiController extends BaseResponseHandler {
  router: Router
  requestUtils: RequestUtils
  appValidator: AppValidator

  constructor() {
    super()
    this.router = express.Router()
    this.appValidator = new AppValidator(this.router)
    this.requestUtils = new RequestUtils(this.router)
    this.initializeServices()
    this.initializeMiddleware()
    this.initializeRoutes()
  }

  protected abstract initializeServices(): void
  protected abstract initializeMiddleware(): void
  protected abstract initializeRoutes(): void
}

export default BaseApiController
