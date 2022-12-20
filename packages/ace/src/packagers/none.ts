import { TwiConfig } from '../config'

export const none = async (packageDir: string, { name }: TwiConfig) => {
  console.log(`${name}: packaging disabled by configuration`)
}
