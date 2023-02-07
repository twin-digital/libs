import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { get, map } from 'lodash/fp'

export interface ListObjectKeysOptions {
  /**
   * Name of the S3 bucket containing repository data.
   */
  bucket: string

  /**
   * S3 client to use for issuing S3 commands.
   * @default new S3Client({});
   */
  client?: S3Client

  /**
   * String to prepend to object IDs when building S3 keys. Can be used to store multiple types of objects in
   * the same S3 bucket.
   * @default no prefix
   */
  prefix?: string
}

export const listObjectKeys = async ({
  prefix,
  bucket,
  client = new S3Client({}),
}: ListObjectKeysOptions) => {
  const results = [] as string[]
  let continuationToken: string | undefined

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    )

    const { Contents } = response
    results.push(...map(get('Key'), Contents))

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return results
}
