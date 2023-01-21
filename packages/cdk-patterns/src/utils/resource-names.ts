import { compact, flow, isNumber, join, kebabCase } from 'lodash/fp'
import { ConstructConstructor, ShortName } from '../types'
import { HasContext } from './context'
import { getEnvironment, getInstanceQualifer, getWorkload } from './environment'
import { pascalCase } from './pascal-case'

export type GetResourceNameOptions = {
  /**
   * If set, will cause a suffix to be appended to resource names. The suffix will be the letter 'z' repeated a
   * certain number of times. If falsy, no suffix is appended. If true, 'zzzz' is appended. If a number other than 0,
   * a suffix with the specified number of 'z' characters is appended.
   *
   * This was originally intended to append a randomly changing suffix to ensure uniqueness. However, this caused
   * CFN (and therefore cdk) to create new resources instead of using existing ones. This option should no longer
   * be used.
   *
   * @deprecated this appends a static suffix, since non-deterministic resource names cause cdk to recreate resources)
   */
  addSuffix?: number | boolean | undefined
}

/**
 * Given the GetResourceNameOptions, return the requested suffix.
 * @deprecated
 **/
const getSuffixPart = ({ addSuffix }: GetResourceNameOptions) => {
  if (isNumber(addSuffix)) {
    return 'z'.repeat(addSuffix)
  } else if (addSuffix === true) {
    return 'z'.repeat(4)
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

/**
 * @deprecated getQualifiedName is preferred, because it is simpler, includes workload, and does not have a broken suffix
 */
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

/**
 * Given a scope for context and a short name, returns a qualified name that includes the workload and
 * namespace qualifier.
 */
export const getQualifiedName = (scope: HasContext, name: string) => {
  const { environmentType, namespace } = getEnvironment(scope)
  const qualifier = getInstanceQualifer(environmentType, namespace)
  return join('-', [getWorkload(scope), name, qualifier])
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
