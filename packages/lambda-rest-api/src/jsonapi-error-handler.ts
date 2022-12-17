import middy from '@middy/core'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { isNumber, isObject } from 'lodash/fp'
import { normalizeHttpResponse } from '@middy/util'

export type JsonApiErrorHandler = {
  /**
   * Log function to report the error to. Defaults to `console.error`
   */
  logger?: typeof console['error']
}

/**
 * Middy middleware that handles errors thrown by the handler, and returns a JSON:API
 * compatible error response. If the error type is HttpError, the fields on that error will
 * be used to build the response.
 */
export const jsonApiErrorHandler = ({
  logger = console.error,
}: JsonApiErrorHandler = {}): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => ({
  onError: (request) => {
    const error = request.error

    logger(error)

    const {
      code = undefined,
      detail = undefined,
      status = 500,
      title = undefined,
    } = (isObject(error) ? error : {}) as Record<string, unknown>

    const statusCode = isNumber(status) ? status : 500

    normalizeHttpResponse(request)

    request.response = {
      ...(request.response ?? {}),
      body: JSON.stringify({
        errors: [
          {
            code,
            detail,
            status: statusCode,
            title,
          },
        ],
      }),
      headers: {
        ...(request.response?.headers ?? {}),
        'Content-Type': 'application/json',
      },
      statusCode,
    }
  },
})
