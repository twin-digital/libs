import fs from 'node:fs'
import path from 'node:path'
import tar from 'tar'

import type { TwiConfig } from '../config'
import { removeScope } from '../utils'

export const archive = async (packageDir: string, { name }: TwiConfig) => {
  const destination = 'dist'
  const destinationPath = path.join(packageDir, destination)
  const outputFileName = `${removeScope(name)}.tar.gz`
  const output = `${destinationPath}/${outputFileName}`

  fs.mkdirSync(destinationPath, { recursive: true })

  tar.c(
    {
      cwd: packageDir,
      file: output,
      filter: (entry) => !entry.startsWith(`./${destination}`),
      gzip: true,
      noPax: true,
      sync: true,
    },
    ['.']
  )

  console.log(`${name}: created ${destination}/${outputFileName}`)
}
