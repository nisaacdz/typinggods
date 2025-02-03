import { Router } from "express"
import BaseResponseHandler from "../../controllers/base-controllers/base-response-handler.controller"
import RequestUtils from "../../extensions/utils/request.utils"

/**
 * An abstract class that provides a base middleware for all routers.
 */
abstract class BaseRouterMiddleware extends BaseResponseHandler {
  public router
  public requestUtils

  constructor(appRouter: Router) {
    super()
    this.router = appRouter
    this.requestUtils = new RequestUtils(appRouter)
  }
}

export default BaseRouterMiddleware
