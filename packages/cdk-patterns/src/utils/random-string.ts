import crypto from 'node:crypto'

/**
 * Generates a random string of a given length. Not intended for cryptographic purposes, but mainly just
 * to support id de-duping use cases, or provide filler ids/names when the user doesn't provide any.
 * @param length the length of string to generate
 */
export const randomString = (length: number) =>
  // The resulting string will be twice as long as the random bytes you generate with crypto.randomBytes
  crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .substring(0, length)
