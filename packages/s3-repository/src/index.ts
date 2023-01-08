import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { compact, flow, get, join, map } from 'lodash/fp'

export type S3RepositoryOptions = {
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

/**
 * A minimal document storage API, backed by an S3 bucket.
 *
 * S3 is not optimized for use as a document database, and is chosen only because it is very easy to implement and
 * incredibly low-cost. Using this repository will potentially introduce scalability or data consistency concerns.
 * Due to the eventually-consistent nature of S3, multiple concurrent writes to the same object could result in data
 * loss and should be avoided.
 *
 * The current version of this repository does not implement pagination, and so the `list` method will not return all
 * data if there are more than 1,000 objects in the repository.
 */
export type S3Repository<T extends Record<string, unknown>> = {
  /**
   * Given the ID of an object, deletes the object from the repository. Will silently do nothing if
   * the specified ID is invalid.
   */
  delete: (id: string) => Promise<void>

  /**
   * Given the ID of an object, return the object's data.
   *
   * @param id id of the object to get
   * @returns the object, or null if no object exists with the given ID
   */
  get: (id: string) => Promise<T | null>

  /**
   * Returns all objects in this repository.
   */
  list: () => Promise<T[]>

  /**
   * Stores an object in the database, given it's ID and data. If an object with the given ID exists, it
   * will be overwritten with the new data. Otherwise, a new object is created.
   */
  save: (id: string, data: T) => Promise<ObjectCoordinates>
}

export type ObjectCoordinates = {
  bucket: string
  key: string
}

/**
 * Given the S3 client instance, a bucket name, and an object's prefix and id, delete the object from S3.
 */
const deleteObject = async (
  client: S3Client,
  bucket: string,
  prefix: string | undefined,
  id: string
): Promise<void> => {
  const key = prefix === undefined ? id : join('/', [prefix, id])

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    await client.send(command)
  } catch (err) {
    if (!(err instanceof NoSuchKey)) {
      throw err
    }

    // NoSuchKey errors will be silently ignored
  }
}

/**
 * Given the S3 client instance, a bucket name, and an object's prefix and id, return a single document from the bucket
 * and parse it. Will return 'null' if there is no such object in the repository.
 */
const fetchObject = async <T extends Record<string, unknown>>(
  client: S3Client,
  bucket: string,
  prefix: string | undefined,
  id: string
): Promise<T | null> => {
  const key = prefix === undefined ? id : join('/', [prefix, id])

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const { Body } = await client.send(command)

    const bodyContent = await Body?.transformToString('utf8')
    if (bodyContent === undefined) {
      throw new Error(`Unable to read object: Body was undefined. [id=${id}]`)
    }

    return JSON.parse(bodyContent) as T
  } catch (err) {
    if (err instanceof NoSuchKey) {
      return null
    }

    throw err
  }
}

/** Removes a prefix from the beginning of a string, IFF the string starts with that prefix */
const removePrefix =
  (prefix: string | undefined) =>
  (value: string): string =>
    prefix !== undefined && value.startsWith(prefix)
      ? value.substring(prefix.length)
      : value

/**
 * Given the S3 client instance, a bucket name, and a prefix, return the ids for all objects stored in that bucket/prefix
 * combination.
 */
const listIds = async (
  client: S3Client,
  bucket: string,
  prefix: string | undefined
): Promise<string[]> => {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  })

  const { Contents } = await client.send(command)
  return flow(map(get('Key')), compact, map(removePrefix(prefix)))(Contents)
}

/**
 * Saves an object in S3 given the S3 client instance, a bucket name, and the object's prefix and id.
 */
const saveObject = async <T extends Record<string, unknown>>(
  client: S3Client,
  bucket: string,
  prefix: string | undefined,
  id: string,
  data: T
): Promise<ObjectCoordinates> => {
  const key = prefix === undefined ? id : join('/', [prefix, id])

  const command = new PutObjectCommand({
    Body: JSON.stringify(data),
    Bucket: bucket,
    Key: key,
  })

  await client.send(command)

  return {
    bucket,
    key,
  }
}

/**
 * Creates a new S3Repository instance, given the bucket name (and an optional prefix to add to all objects).
 */
export const createS3Repository = <T extends Record<string, unknown>>({
  bucket,
  client = new S3Client({}),
  prefix,
}: S3RepositoryOptions): S3Repository<T> => {
  const normalizedPrefix = prefix === undefined ? undefined : prefix

  return {
    delete: (id: string) => deleteObject(client, bucket, normalizedPrefix, id),
    get: (id: string) => fetchObject<T>(client, bucket, normalizedPrefix, id),
    list: async () => {
      const ids = await listIds(client, bucket, normalizedPrefix)
      // since we just looked up IDs, we should have no 'nulls', but we have to compact because
      // Typescript doesn't know this. (And an object _could_ have been deleted, technically.)
      return compact(
        await Promise.all(
          map((id) => fetchObject<T>(client, bucket, normalizedPrefix, id), ids)
        )
      )
    },
    save: (id: string, data: T) =>
      saveObject(client, bucket, normalizedPrefix, id, data),
  }
}
