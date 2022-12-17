import fs from 'node:fs'
import path from 'node:path'
import { pathsToModuleNameMapper } from 'ts-jest'
import type { Config } from 'jest'

import { compilerOptions } from './tsconfig.json'

const getProjectRoots = () => {
  const cwd = fs.readdirSync(path.join(__dirname, 'packages'))
  return cwd.map((entry) => path.join(__dirname, 'packages', entry))
}

export default async (): Promise<Config> => {
  const config = {
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths),
    preset: 'ts-jest',
    roots: [
      ...getProjectRoots().map((root) => `${root}/src`),
      ...getProjectRoots().map((root) => `${root}/test`),
    ].filter((dir) => fs.existsSync(dir)),
  }

  return config
}
