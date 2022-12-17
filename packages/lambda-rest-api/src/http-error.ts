/**
 * Options used to create an HttpError instance.`s
 */
export type HttpErrorOptions = {
  /**
   * An application-specific error code, expressed as a string value.
   */
  code?: string

  /**
   * Human-readable explanation specific to this occurrence of the problem.
   */
  detail?: string

  /**
   * HTTP status code applicable to this problem
   *
   * @default 500
   */
  status?: number

  /**
   * Short, human-readable summary of the problem that SHOULD NOT change from occurrence to occurrence of the problem
   */
  title?: string
}

/**
 * Error subclass that contains details necessary to create a JSON:API compatible 'error' object.
 *
 * @see https://jsonapi.org/format/#errors
 */
export class HttpError extends Error {
  public code?: string
  public detail?: string
  public status: number
  public title?: string

  constructor({ code, detail, status = 500, title }: HttpErrorOptions = {}) {
    super('Error in HTTP handler')
    this.code = code
    this.detail = detail
    this.status = status
    this.title = title

    Object.setPrototypeOf(this, HttpError.prototype)
  }
}
