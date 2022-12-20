import { exec, execSync } from 'node:child_process'
import path from 'node:path'
import esbuild from 'esbuild'

import type { BuildConfigLibrary, TwiConfig } from '../config'
import { findAllFiles } from './helpers'

// TODO: just use tsc for this?

/**
 * Transpiles a library into the 'lib' folder, and generates type declarations.
 */
export const library = async (
  packageDir: string,
  _config: BuildConfigLibrary,
  { name }: TwiConfig
) => {
  const result = await esbuild.build({
    bundle: false,
    entryPoints: findAllFiles(path.join(packageDir, 'src')),
    format: 'cjs',
    metafile: true,
    minify: true,
    outdir: './lib',
    platform: 'node',
    sourcemap: 'external',
    target: 'node16',
  })

  execSync('tsc --emitDeclarationOnly', { cwd: packageDir, stdio: 'inherit' })

  console.log(
    `${name}: built ${Object.keys(result.metafile.inputs).length} files`
  )
}
