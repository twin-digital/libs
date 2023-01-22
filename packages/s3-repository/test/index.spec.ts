import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
  _Object,
  S3Client,
} from '@aws-sdk/client-s3'
import { last, map } from 'lodash/fp'
import { v4 as uuid } from 'uuid'

import { createS3Repository, S3Repository } from '../src/index'

const s3 = new S3Client({})

/**
 * Removes all objects from an **unversioned** bucket, ensuring it is empty. This is required before attempting to
 * delete a bucket.
 *
 * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-bucket.html#delete-bucket-awssdks
 * @param bucket name of the bucket to empty
 */
const removeAllBucketObjects = async (bucket: string) => {
  let done = false
  let marker: string | undefined

  const s3ObjectToDeletePromise = ({ Key }: _Object) => {
    return s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key,
      })
    )
  }

  while (!done) {
    const { Contents, IsTruncated, NextMarker } = await s3.send(
      new ListObjectsCommand({
        Bucket: bucket,
        Marker: marker,
      })
    )

    await Promise.allSettled(map(s3ObjectToDeletePromise, Contents ?? []))

    if (!IsTruncated) {
      done = true
    } else {
      // From docs: if response does not include the NextMarker and it is truncated, you can use the value of the
      //   last Key in the response as the marker

      marker = NextMarker ?? last(Contents)?.Key
    }
  }
}

describe('S3Repository', () => {
  describe.each([
    ['without prefix', undefined],
    ['with prefix (no trailing slash)', 'test-prefix'],
    ['with prefix (has trailing slash)', 'test-prefix/'],
  ] as const)('%s', (_testName, prefix) => {
    let unitUnderTest: S3Repository<any>
    let testBucket: string

    beforeEach(async () => {
      const newBucketName = `test.${uuid()}`

      await s3.send(
        new CreateBucketCommand({
          Bucket: newBucketName,
        })
      )

      testBucket = newBucketName
      unitUnderTest = createS3Repository({
        bucket: testBucket,
        prefix,
      })
    })

    afterEach(async () => {
      // if bucket creation failed there will be no bucket name set and we skip tearing it down
      if (testBucket) {
        await removeAllBucketObjects(testBucket)

        await s3.send(
          new DeleteBucketCommand({
            Bucket: testBucket,
          })
        )
      }
    })

    it('can save and restore an object', async () => {
      const testId = uuid()
      const content = `expected-test-content-${testId}`

      await unitUnderTest.save(testId, content)

      const retrievedContent = await unitUnderTest.get(testId)
      expect(retrievedContent).toEqual(content)
    })

    it('uses correct key for saved objects', async () => {
      const testId = uuid()
      const content = `expected-test-content-${testId}`

      const { key } = await unitUnderTest.save(testId, content)

      if (prefix === undefined) {
        expect(key).toEqual(testId)
      } else {
        expect(key).toEqual(`test-prefix/${testId}`)
      }
    })

    it('can delete an object', async () => {
      const testId = uuid()
      const content = `expected-test-content-${testId}`

      await unitUnderTest.save(testId, content)
      await unitUnderTest.delete(testId)

      const retrievedContent = await unitUnderTest.get(testId)
      expect(retrievedContent).toBeNull()
    })

    it('can return a list of all objects', async () => {
      const testId = uuid()

      await unitUnderTest.save(`${testId}.1`, 'expected content 1')
      await unitUnderTest.save(`${testId}.2`, 'expected content 2')
      await unitUnderTest.save(`${testId}.3`, 'expected content 3')

      const contents = await unitUnderTest.list()
      expect(contents).toContain('expected content 1')
      expect(contents).toContain('expected content 2')
      expect(contents).toContain('expected content 3')
    })
  })
})
