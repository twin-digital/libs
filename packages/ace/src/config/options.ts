import type { BuildConfig, PackageConfig } from './config'

/** User-facing interface for build options */
export type BuildOptions = boolean | Partial<BuildConfig>

/** User-facing interface for package options */
export type PackageOptions = boolean | Partial<PackageConfig>

export type TwiOptions = {
  /**
   * User-specified packaging options. If set to false, no artifact will be created for the package. If
   * set to true, then the entire package folder will packaged into a tarball and placed in the 'dist'
   * folder. Otherwise, the specified options will be applied. Defaults to 'false'.
   */
  package?: PackageOptions

  /**
   * User-specified build options. If set to false, the package will not be built. If set to true, then
   * the package will be built using the default options for a library. Otherwise, the specified options
   * will be applied. If an array of options is provided, they will all be executed in order. Defaults to
   * 'true'.
   */
  build?: BuildOptions | BuildOptions[]
}
