import fs from 'node:fs'
import path from 'node:path'

const BuildableExtensions: string[] = [
  '.cjs',
  '.cts',
  '.css',
  '.js',
  '.json',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
  '.txt',
]

/** Determines if esbuild can build a file, based on it's name. */
export const isBuildableFile = (name: string) => {
  const ext = path.parse(name).ext
  return BuildableExtensions.includes(ext)
}

/**
 * Recursively find all files in the specified directory, and return an array containing all of their full paths.
 */
export const findAllFiles = (dir: string) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  const files: string[] = []

  for (const entry of entries) {
    if (entry.isFile() && isBuildableFile(entry.name)) {
      files.push(path.join(dir, entry.name))
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...findAllFiles(path.join(dir, entry.name)))
    }
  }

  return files
}
