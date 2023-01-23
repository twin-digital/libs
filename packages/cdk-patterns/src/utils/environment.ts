import { getContextEnum, getContextString, HasContext } from './context'

export const EnvironmentTypes = ['dev', 'prod'] as const
export type EnvironmentType = typeof EnvironmentTypes[number]

export type EnvironmentMetadata = {
  environmentType: EnvironmentType
  namespace: string
}

/**
 * Retrieves the qualifier for a given instance of a workload, given the instance's environment and
 * namespace. If the namespace is 'default', the qualifier will be the environment name. Otherwise, the
 * namespace name will be used as the qualifier.
 *
 * @param environmentType environment type (dev, prod, etc.) of the instance
 * @param namespace instance namespace, which defaults to 'default'
 * @returns qualifier string for the instance
 */
export const getInstanceQualifer = (
  environmentType: EnvironmentType,
  namespace = 'default'
) => (namespace === 'default' ? environmentType : namespace)

/**
 * Given a CDK scope (i.e. object with context), return metadata about the environment we are executing in.
 **/
export const getEnvironment = (scope: HasContext): EnvironmentMetadata => {
  const environmentType = getContextEnum(
    scope,
    'environmentType',
    EnvironmentTypes
  )
  const namespace = getContextString(scope, 'namespace', 'default')

  return {
    environmentType,
    namespace,
  }
}

/**
 * Given a CDK scope (i.e. object with context), return the name of the workload from context
 **/
export const getWorkload = (scope: HasContext): string => {
  return getContextString(scope, 'workload')
}
