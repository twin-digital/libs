import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import type { BuildConfigCdk, TwiConfig } from '../config'

const execFileP = promisify(execFile)

export const cdk = async (
  packageDir: string,
  _config: BuildConfigCdk,
  { name }: TwiConfig
) => {
  await execFileP('npx', ['cdk', 'synth'], {
    cwd: packageDir,
  })

  console.log(`${name}: synthesized cdk app`)
}
