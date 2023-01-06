import middy from '@middy/core'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { isNumber, isObject, map } from 'lodash/fp'
import { normalizeHttpResponse } from '@middy/util'
import { ErrorObject } from 'ajv'
import { omit } from 'lodash'

export type JsonApiErrorHandlerOptions = {
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
}: JsonApiErrorHandlerOptions = {}): middy.MiddlewareObj<
  APIGatewayProxyEvent,
  APIGatewayProxyResult
> => ({
  onError: (request) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const error = <any>request.error

    logger(error)

    const createValidationErrorResponse = (validationErrors: ErrorObject[]) => {
      const ajvErrorToJsonApiError = (
        validationError: ErrorObject & {
          dataPath: string
          instancePath: string
        }
      ) => ({
        detail: validationError.message,
        meta: {
          ...omit(validationError, ['dataPath', 'instancePath', 'message']),
        },
        source: {
          pointer: validationError.instancePath ?? validationError.dataPath,
        },
        status: '400',
        title: 'Validation Error',
      })

      return {
        body: JSON.stringify({
          errors: map(ajvErrorToJsonApiError, validationErrors),
        }),
        statusCode: 400,
      }
    }

    const createGenericErrorResponse = () => {
      const {
        code = undefined,
        detail = undefined,
        status = 500,
        title = undefined,
      } = (isObject(error) ? error : {}) as Record<string, unknown>

      const statusCode = isNumber(status) ? status : 500

      return {
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
        statusCode,
      }
    }

    const isValidationError = error.expose && error.cause

    normalizeHttpResponse(request)

    request.response = {
      ...(request.response ?? {}),
      ...(isValidationError
        ? createValidationErrorResponse(error.cause)
        : createGenericErrorResponse()),
      headers: {
        ...(request.response?.headers ?? {}),
        'Content-Type': 'application/json',
      },
    }
  },
})
