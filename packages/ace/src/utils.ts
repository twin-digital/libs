export const removeScope = (packageName: string) => {
  // this will allow some invalid package names, but our goal isn't general package name validation anyway
  const match = packageName.match(/^(?:@[-a-z0-9._~]+\/)?([-a-z0-9._~]+)$/)
  if (match === null) {
    throw new Error(`Unrecognized package name format: ${packageName}`)
  }

  return match[1]
}
