import middy from '@middy/core'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { HttpError } from './http-error'

export type ValidationErrorHandlerOptions = Record<string, never>

/**
 * Middy middleware that handles errors thrown by the handler, and returns a JSON:API
 * compatible error response. If the error type is HttpError, the fields on that error will
 * be used to build the response.
 */
export const validationErrorHandler = (): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => ({
  onError: (request) => {
    const response = request.response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = <any>request.error

    if (!error) {
      return
    }

    if (response?.statusCode != 400) {
      return
    }

    if (!error.expose || !error.cause) {
      return
    }

    response.body = JSON.stringify({
      message: response.body,
      validationErrors: error.cause,
    })

    request.error = new HttpError({
      detail: error.cause,
      status: 400,
      title: 'Invalid Request Body',
    })
  },
})
