import { BuildOptions } from 'esbuild'

export const BuildModes = [
  // bundle package sources and all dependencies into single file
  'bundle',
  // build a cdk package by running cdk's "synth" command
  'cdk',
  // transpile sources into 'lib' as separate files
  'library',
  // do not build this package
  'none',
] as const

export const PackageModes = [
  // all package contents are packaged into an archive in the 'dist' folder
  'archive',
  // do not build artifacts for this package
  'none',
] as const

export type BuildMode = typeof BuildModes[number]
export type PackageMode = typeof PackageModes[number]

/**
 * Configuration controlling how source code is transformed, such as transpilation and bundling.
 */
export type BuildConfig =
  | BuildConfigBundle
  | BuildConfigCdk
  | BuildConfigLibrary
  | BuildConfigNone

export type BuildConfigBundle = {
  mode: 'bundle'

  /**
   * One or more entrypoints to bundle, relative to the package directory. If not specified, defaults to
   * 'src/index.ts'.
   */
  entryPoints?: string | [string, ...string[]]

  /**
   * Optional extra options to pass to esbuild.build. If not specified, the following defaults are used:
   *
   *   - format: 'cjs'
   *   - minify: 'true'
   *   - outdir: '<PACKAGE_DIR>/dist'
   *   - platform: 'node'
   *   - sourcemap: 'external'
   *   - target: 'node16'
   *
   * The following options cannot be specified:
   *
   *   - bundle: Always 'true'
   *   - entryPoints: Uses the 'entryPoints' top-level option
   *   - metafile: Always 'true'
   */
  esbuildOptions?: Omit<BuildOptions, 'bundle' | 'metafile'>
}

export type BuildConfigCdk = {
  mode: 'cdk'
}

export type BuildConfigLibrary = {
  mode: 'library'
}

export type BuildConfigNone = {
  mode: 'none'
}

/**
 * Configuration controlling how deployable/publishable artifacts are created from a package. Packaging happens
 * after any build operations are completed.
 */
export interface PackageConfig {
  mode: PackageMode
}

export interface TwiConfig {
  /**
   * Set of steps that should be taken when a package is build.
   */
  build: BuildConfig[]

  /** the name of the package */
  name: string

  /** configuration describing how to convert a package into a releaseable artifact */
  package: PackageConfig
}
