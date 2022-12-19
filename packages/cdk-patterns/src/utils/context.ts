/**
 * Minimal type for CDK constructs with context information.`s
 */
export type HasContext = {
  node: {
    setContext(key: string, value: unknown): void
    tryGetContext(key: string): unknown
  }
}

/**
 * Given a short name, construct a scoped context key.
 */
export const getContextKey = (name: string) => `io.twin-digital.${name}`

/**
 * Given a context scope and short name, set a context value using it's fully-scoped key.
 */
export const setContextValue = <T = unknown>(
  scope: HasContext,
  name: string,
  value: T
): void => {
  scope.node.setContext(getContextKey(name), value)
}

/**
 * Given a context scope and short name, return the value using it's fully-scoped key. If the value does not exist,
 * the default will be returned. If no default is provided, an error is thrown.
 */
export const getContextValue = <T = unknown>(
  scope: HasContext,
  name: string,
  defaultValue?: T
): T => {
  const value = scope.node.tryGetContext(getContextKey(name)) ?? defaultValue
  if (!value) {
    throw new Error(`Context key not found: ${getContextKey(name)}`)
  }

  return value as T
}

/**
 * Given a context scope and short name, return the value using it's fully-scoped key. The value will be converted
 * to a string. If the value does not exist, the default will be returned. If no default is provided, an error is
 * thrown.
 */
export const getContextString = (
  scope: HasContext,
  name: string,
  defaultValue?: string
): string => String(getContextValue(scope, name, defaultValue))

/**
 * Given a context scope and short name, return the value from context using it's fully scoped key. If the value
 * is not in the supplied set of allowed values, an error will be thrown. If the value does not exist,
 * the default will be returned. If no default is provided, an error is thrown.
 */
export const getContextEnum = <T extends readonly unknown[]>(
  scope: HasContext,
  name: string,
  allowedValues: T,
  defaultValue?: T[number]
): T[number] => {
  const value = getContextValue(scope, name, defaultValue)
  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid value for context key "${getContextKey(
        name
      )}": value} (Must be one of ${JSON.stringify(allowedValues)})`
    )
  }

  return value
}
