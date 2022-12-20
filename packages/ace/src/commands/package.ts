import path from 'node:path'
import process from 'node:process'
import { CommandModule } from 'yargs'
import { getConfig } from '../config'
import * as packagers from '../packagers'

export interface PackageOptions {
  /**
   * Directory containing the package to create an artifact for.
   * Default: cwd
   */
  packageDir: string
}

/**
 * Creates a package artifact by parsing the config, and calling the correct packager from the '../packagers' directory.
 */
export const createPackage = async ({ packageDir }: PackageOptions) => {
  const config = getConfig(packageDir)
  await packagers[config.package.mode](packageDir, config)
}

const command: CommandModule<Record<string, unknown>, PackageOptions> = {
  builder: (yargs) => {
    return yargs.options({
      packageDir: {
        coerce: path.resolve,
        default: process.cwd(),
        describe: 'directory containing the package to create an artifact for',
        type: 'string',
      },
    })
  },
  command: 'package',
  describe: 'creates a deployable artifact from a package',
  handler: createPackage,
}

export default command
