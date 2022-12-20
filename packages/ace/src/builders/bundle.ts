import path from 'node:path'
import esbuild from 'esbuild'
import { castArray, map } from 'lodash/fp'

import type { BuildConfigBundle, TwiConfig } from '../config'

export const bundle = async (
  packageDir: string,
  {
    entryPoints = path.join('src', 'index.ts'),
    esbuildOptions = {},
  }: BuildConfigBundle,
  { name }: TwiConfig
) => {
  const result = await esbuild.build({
    bundle: true,
    entryPoints: map(
      (entryPoint) => path.join(packageDir, entryPoint),
      castArray(entryPoints)
    ),
    format: 'cjs',
    metafile: true,
    minify: true,
    outdir: './dist',
    platform: 'node',
    sourcemap: 'inline',
    target: 'node16',
    ...esbuildOptions,
  })

  console.log(
    `${name}: built ${Object.keys(result.metafile.inputs).length} files`
  )
}
