import { castArray, map } from 'lodash/fp'
import fs from 'node:fs'
import path from 'node:path'
import type { BuildConfig, PackageConfig, TwiConfig } from './config'
import type { BuildOptions, PackageOptions, TwiOptions } from './options'

// need better validation
type TwiPackageJson = Record<string, unknown> & {
  name: string
  ace?: TwiOptions | undefined
}

const readPackageJson = (packageDir: string): TwiPackageJson => {
  const packageJsonPath = path.resolve(packageDir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`No package.json found in package-dir: ${packageDir}`)
  }

  const contents = fs.readFileSync(packageJsonPath, 'utf8')
  try {
    return JSON.parse(contents)
  } catch (err) {
    console.error(
      `Invalid package.json found in package-dir: ${packageDir}`,
      err
    )
    throw new Error(`Invalid package.json found in package-dir: ${packageDir}`)
  }
}

/**
 * Converts a BuildOptions object into a fully-hydrated BuildConfig.
 */
const getBuildConfig = (config: BuildOptions | undefined): BuildConfig => {
  switch (config) {
    case true:
    case undefined:
      return {
        mode: 'library',
      }

    case false:
      return {
        mode: 'none',
      }

    default:
      return {
        ...config,
        mode: config.mode ?? 'library',
      }
  }
}

/**
 * Converts a PackageOptions object into a fully-hydrated PackageConfig.
 */
const getPackageConfig = (
  config: PackageOptions | undefined
): PackageConfig => {
  switch (config) {
    case true:
      return {
        mode: 'archive',
      }

    case false:
    case undefined:
      return {
        mode: 'none',
      }

    default:
      return {
        ...config,
        mode: config?.mode ?? 'archive',
      }
  }
}
/**
 * Read configuration information from the package specified by the given directory, and return
 * a corresponding TwiConfig object.
 */
export const getConfig = (packageDir: string): TwiConfig => {
  const packageJson = readPackageJson(packageDir)

  return {
    build: map(getBuildConfig, castArray(packageJson.ace?.build ?? [])),
    name: packageJson.name,
    package: getPackageConfig(packageJson.ace?.package),
  }
}
