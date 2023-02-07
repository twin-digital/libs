import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { compact, flow, get, map } from 'lodash/fp'
import { findObjectsByMetadata } from './find-objects-by-metadata'
import { listObjectKeys } from './list-object-keys'
import { buildPartitionedPath, getDatePartitions } from './partitioning'

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
 * Given a repository prefix (or undefined), return a normalized prefix string. The string may be empty (for undefined
 * prefixes), and will always end with a single '/' character regardless of whether the input prefix did or did not
 * have one. Additional slash characters in the prefix will not be modified.
 */
const normalizePrefix = (prefix: string | undefined): string => {
  if (prefix === undefined) {
    return ''
  } else if (prefix.endsWith('/')) {
    return prefix
  } else {
    return `${prefix}/`
  }
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
  const keys = await findObjectsByMetadata({
    bucket,
    prefix,
    key: 'id',
    value: id,
  })

  if (keys.length === 0) {
    // not found
    return
  }

  for (const key of keys) {
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
}

/**
 * Given the S3 client instance, a bucket name, and an object's key, return a single document from the bucket
 * and parse it. Will return 'null' if there is no such object in the repository.
 */
const fetchByKey = async <T extends Record<string, unknown>>(
  client: S3Client,
  bucket: string,
  key: string
): Promise<T | null> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const { Body } = await client.send(command)

    const bodyContent = await Body?.transformToString('utf8')
    if (bodyContent === undefined) {
      throw new Error(`Unable to read object: Body was undefined. [key=${key}]`)
    }

    return JSON.parse(bodyContent) as T
  } catch (err) {
    if (err instanceof NoSuchKey) {
      return null
    }

    throw err
  }
}

/**
 * Given the S3 client instance, a bucket name, and an object's prefix and id, return a single document from the bucket
 * and parse it. Will return 'null' if there is no such object in the repository.
 */
const fetchById = async <T extends Record<string, unknown>>(
  client: S3Client,
  bucket: string,
  prefix: string | undefined,
  id: string
): Promise<T | null> => {
  const keys = await findObjectsByMetadata({
    bucket,
    prefix,
    key: 'id',
    value: id,
  })

  if (keys.length === 0) {
    // not found
    return null
  }

  if (keys.length > 1) {
    // our s3 bucket is corrupt and has duplicate keys
    throw new Error(`Multiple objects found with id: ${id}`)
  }

  return fetchByKey(client, bucket, keys[0])
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
  const normalizedPrefix = prefix && normalizePrefix(prefix)

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: normalizedPrefix,
  })

  const { Contents } = await client.send(command)
  return flow(
    map(get('Key')),
    compact,
    map(removePrefix(normalizedPrefix))
  )(Contents)
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
  const prefixPart = prefix === undefined ? '' : `${normalizePrefix(prefix)}`
  const key = `${prefixPart}${buildPartitionedPath([
    ...getDatePartitions(),
    {
      name: 'id',
      value: id,
    },
  ])}`

  const command = new PutObjectCommand({
    Body: JSON.stringify(data),
    Bucket: bucket,
    Key: key,
    Metadata: {
      id,
    },
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
  return {
    delete: (id: string) => deleteObject(client, bucket, prefix, id),
    get: (id: string) => fetchById<T>(client, bucket, prefix, id),
    list: async () => {
      const keys = await listObjectKeys({
        bucket,
        client,
        prefix,
      })

      return compact(
        await Promise.all(
          map((key) => fetchByKey<T>(client, bucket, key), keys)
        )
      )
    },
    save: (id: string, data: T) => saveObject(client, bucket, prefix, id, data),
  }
}
