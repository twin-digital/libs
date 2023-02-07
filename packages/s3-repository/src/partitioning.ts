import { join, map } from 'lodash/fp'

export interface PartitionKey {
  name: string
  value: string
}

export const getDatePartitions = (): PartitionKey[] => {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1 // months are 0-based in JavaScript
  const day = now.getUTCDate()

  return [
    {
      name: 'year',
      value: `${year}`,
    },
    {
      name: 'month',
      value: `${month}`,
    },
    {
      name: 'day',
      value: `${day}`,
    },
  ]
}

export const buildPartitionedPath = (partitions: PartitionKey[]) =>
  join(
    '/',
    map(({ name, value }) => `${name}=${value}`, partitions)
  )
