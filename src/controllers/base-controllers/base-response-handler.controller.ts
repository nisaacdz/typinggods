import { Response } from "express"
import { logger } from "../../extensions/helpers/logger.helper"
import { IResponseMessage } from "../../extensions/types/response.type"
import HTTP_STATUS_CODE from "../../extensions/utils/http-status-code"

abstract class BaseResponseHandler {
  protected async sendErrorResponse(
    res: Response,
    err: Error,
    responseMessage: IResponseMessage,
    statusCode: number,
    data?: Record<string, any>
  ) {
    const response = {
      status: HTTP_STATUS_CODE[statusCode as keyof typeof HTTP_STATUS_CODE],
      message: responseMessage.message,
      statusCode: statusCode,
      data,
    }

    if (statusCode === 500)
      logger.error(response.message, "\n" + res, "\n" + err)

    res.status(statusCode).json(response)
  }

  protected async sendSuccessResponse(
    res: Response,
    message: string,
    data: any = null,
    statusCode: number = 200
  ) {
    const response = {
      status: HTTP_STATUS_CODE[statusCode as keyof typeof HTTP_STATUS_CODE],
      // statusCode: statusCode,
      message: message,
      data,
    }
    res.status(statusCode).json(response)
  }
}

export default BaseResponseHandler
