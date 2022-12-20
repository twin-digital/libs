import { BuildConfigNone, TwiConfig } from '../config/config'

export const none = async (
  _packageDir: string,
  _config: BuildConfigNone,
  { name }: TwiConfig
) => {
  console.log(`${name}: build disabled by configuration`)
}
