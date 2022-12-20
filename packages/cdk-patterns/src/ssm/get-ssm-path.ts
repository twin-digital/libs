import { IConstruct } from 'constructs'
import { compact, forEach, join, split } from 'lodash/fp'
import { getEnvironment } from '../utils/environment'
import {
  EnvironmentType,
  getInstanceQualifer,
  getWorkload,
} from '../utils/environment'

export type SsmPathScope =
  | {
      /**
       * Construct whose context will be used to lookup the environment, namespace, and workload path parts.
       */
      scope: IConstruct
    }
  | {
      /**
       * Environment type to which this parameter applies.
       */
      environmentType: EnvironmentType

      /**
       * Namespace of the app or service instance. Defaults to 'default'.
       */
      namespace?: string

      /**
       * Name of the workload which owns the parameter.
       */
      workload: string

      // no scope defined if individual parts listed
      scope?: undefined
    }

/**
 * Structure allowing the various segments of a standard SSM path string to be specified
 * individually. See `getSsmpath` for details.
 */
export type SsmPathOptions = SsmPathScope & {
  /**
   * Optional name of the resource within the resource. May contain multiple path parts separated by
   * '/' characters.
   */
  component?: string

  /**
   * Descriptive name for the parameter, scoped by workload and optionally component.
   */
  parameter: string
}

const ValidPathPartRegex = /^[-a-zA-Z0-9_.]+$/

const validate = (whichPart: string, value: string) => {
  if (value.match(ValidPathPartRegex) === null) {
    throw new Error(
      `Invalid name for '${whichPart}': SSM paths may only contain the characters '-a-zA-Z0-9_.'`
    )
  }
}

const asScopeParts = (scope: SsmPathScope) =>
  scope.scope !== undefined
    ? {
        ...getEnvironment(scope.scope),
        workload: getWorkload(scope.scope),
      }
    : scope

/**
 * Constructs the path for an SSM parameter, using a standard format. A standard SSM path has the
 * following form:
 *
 * ```
 * /<INSTANCE_QUALIFIER>/<WORKLOAD>[/<COMPONENT>]/<PARAMETER>
 * ```
 *
 * The instance qualifier is calculated from the environment and namespace, via the `getInstanceQualifier`
 * method. Workload is the name of the service or application the parameter belongs to. Component is a
 * workload-specific identifier that describes a single resource or other part off the workload. The
 * component is optional, and may correspond to multiple path segemnts (i.e. "lambdas/ingest" or
 * "rbac/roles/editor"). Finally, parameter is the short descriptive name for the parameter within the
 * scope of the workload (or component, if specified).
 */
export const getSsmPath = ({
  component,
  parameter,
  ...scope
}: SsmPathOptions): string => {
  const { environmentType, namespace, workload } = asScopeParts(scope)

  const instanceQualifier = getInstanceQualifer(environmentType, namespace)
  if (
    instanceQualifier.toLowerCase().startsWith('ssm') ||
    instanceQualifier.toLowerCase().startsWith('aws')
  ) {
    throw new Error(
      'Invalid namespace for SSM path: paths may not begin with "/aws" or "/ssm" (case insensitive).'
    )
  }

  if (component !== undefined) {
    forEach((part) => validate('component', part), split('/', component))
  }

  validate('namespace', instanceQualifier)
  validate('parameter', parameter)
  validate('workload', workload)

  const parts = compact([
    getInstanceQualifer(environmentType, namespace),
    workload,
    component,
    parameter,
  ])

  return `/${join('/', parts)}`
}
