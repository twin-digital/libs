import { compact, flow, isNumber, join, kebabCase, toLower } from 'lodash/fp'
import { ConstructConstructor, ShortName } from '../types'
import { HasContext } from './context'
import { getEnvironment } from './environment'
import { pascalCase } from './pascal-case'
import { randomString } from './random-string'

export type GetResourceNameOptions = {
  /**
   * Specifies whether a random suffix is appended to the resource name or not. If falsy, no suffix is appended.
   * If true, a 4-character random suffix is appended. If a number other than 0, a suffix with the specified length
   * is appended.
   */
  addSuffix?: number | boolean | undefined
}

/**
 * Given the GetResourceNameOptions, return the requested suffix.
 **/
const getSuffixPart = ({ addSuffix }: GetResourceNameOptions) => {
  if (isNumber(addSuffix)) {
    return randomString(addSuffix)
  } else if (addSuffix === true) {
    return randomString(4)
  } else {
    return undefined
  }
}

const TypeToAbbreviationMap: Record<string, string> = {
  Cluster: 'clstr',
  LogGroup: 'logs',
  ManagedPolicy: 'plcy',
  Role: 'role',
  TaskDefinition: 'task',
}

/**
 * Given the type of resource and GetResourceNameOptions, return the resource type identifier to include
 * in generated names.
 **/
const getTypePart = (
  type?: ConstructConstructor | undefined,
  options: GetResourceNameOptions = {}
) => {
  return type === undefined ? undefined : TypeToAbbreviationMap[type.name]
}

// TODO: reject invalid short names
export const getResourceName = (
  scope: HasContext,
  shortName: string,
  resourceType?: ConstructConstructor | undefined,
  options: GetResourceNameOptions = {}
) => {
  const { namespace, environmentType } = getEnvironment(scope)

  return flow(
    compact,
    join('-')
  )([
    shortName,
    getTypePart(resourceType, options),
    environmentType.substring(0, 1),
    namespace,
    getSuffixPart(options),
  ])
}

export type NameDecorators = { prefix?: ShortName; suffix?: ShortName }

export const removeNameDecorators = (
  name: ShortName,
  { prefix, suffix }: NameDecorators = {}
) =>
  name
    .replace(new RegExp(`^${prefix}-`), '')
    .replace(new RegExp(`-${suffix}$`), '')

export const shortNameToConstructId = (
  name: ShortName,
  decorators: NameDecorators = {}
) => {
  const { prefix, suffix } = decorators
  return flow(
    compact,
    join('-'),
    pascalCase
  )([prefix, removeNameDecorators(name, decorators), suffix])
}

export const constructIdToShortName = (
  name: ShortName,
  decorators: NameDecorators = {}
) => {
  return removeNameDecorators(kebabCase(name), decorators)
}
