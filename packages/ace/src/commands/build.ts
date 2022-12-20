import path from 'node:path'
import process from 'node:process'
import { CommandModule } from 'yargs'
import { BuildConfig, getConfig, TwiConfig } from '../config'
import * as builders from '../builders'

export interface BuildOptions {
  /**
   * Directory containing the package to build.
   * Default: cwd
   */
  packageDir: string
}

/**
 * Builds a package by parsing the config, and calling the correct builder from the '../builders' directory.
 */
const buildOne = async (
  packageDir: string,
  config: BuildConfig,
  twiConfig: TwiConfig
) => {
  switch (config.mode) {
    case 'none':
      await builders['none'](packageDir, config, twiConfig)
      break

    case 'cdk':
      await builders['cdk'](packageDir, config, twiConfig)
      break

    case 'library':
      await builders['library'](packageDir, config, twiConfig)
      break

    case 'bundle':
      await builders['bundle'](packageDir, config, twiConfig)
      break
  }
}

export const build = async ({ packageDir }: BuildOptions) => {
  const config = getConfig(packageDir)

  try {
    for (const buildConfig of config.build) {
      await buildOne(packageDir, buildConfig, config)
    }
  } catch (err) {
    console.error('Failed to build package:', config.name)
    throw err
  }
}

// Arguments<InferredOptionTypes<P> & InferredOptionTypes<O>>
const command: CommandModule<Record<string, unknown>, BuildOptions> = {
  builder: (yargs) => {
    return yargs.options({
      packageDir: {
        coerce: path.resolve,
        default: process.cwd(),
        describe: 'directory containing the package to build',
        type: 'string',
      },
    })
  },
  command: 'build',
  describe: 'builds a package',
  handler: build,
}

export default command
