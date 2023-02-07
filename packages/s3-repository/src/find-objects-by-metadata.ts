import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { listObjectKeys } from './list-object-keys'

export interface FindObjectsByMetadataOptions {
  /**
   * Name of the S3 bucket containing repository data.
   */
  bucket: string

  /**
   * S3 client to use for issuing S3 commands.
   * @default new S3Client({});
   */
  client?: S3Client

  key: string

  /**
   * String to prepend to object IDs when building S3 keys. Can be used to store multiple types of objects in
   * the same S3 bucket.
   * @default no prefix
   */
  prefix?: string

  value: string
}

export const findObjectsByMetadata = async ({
  prefix,
  bucket,
  client = new S3Client({}),
  key,
  value,
}: FindObjectsByMetadataOptions) => {
  const results = [] as string[]

  const allKeys = await listObjectKeys({
    bucket,
    client,
    prefix,
  })

  for (const candidate of allKeys) {
    const { Metadata } = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: candidate,
      })
    )

    if (Metadata?.[key] === value) {
      results.push(candidate)
    }
  }

  return results
}
