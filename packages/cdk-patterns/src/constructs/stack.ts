import * as cdk from 'aws-cdk-lib'
import { Construct, IConstruct } from 'constructs'
import {
  getContextEnum,
  getContextString,
  getContextValue,
  setContextValue,
} from '../utils/context'
import { EnvironmentType, EnvironmentTypes } from '../utils/environment'
import { getSsmPath } from '../ssm/get-ssm-path'

export type StackProps = cdk.StackProps & {
  /**
   * The name of the 'environment' type (i.e. dev, qa, prod, etc.) for this stack. If not specified, then
   * it will be retrieved from the context of the parent scope (i.e. app or stage). Construction of the
   * stack will fail if there is no value in the context either.
   */
  environmentType?: string

  /**
   * Qualifier used to separate resources from parallel deployments of the same workload. If not specified,
   * then it will be retrieved from the context of the parent scope (i.e. app or stage). Defaults to
   * 'default' if not specified in any available scope.
   */
  namespace?: string

  /**
   * The name of the workload (i.e. app, service, etc.) this stack is a part of. If not specified, then
   * it will be retrieved from the context of the parent scope (i.e. app or stage). Construction of the
   * stack will fail if there is no value in the context either.
   */
  workload?: string
}

/**
 * Base class for Twin Digital CDK Stacks.
 */
export abstract class Stack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    { environmentType, namespace, workload, ...props }: StackProps
  ) {
    super(scope, id, props)

    if (environmentType) {
      setContextValue(this, 'environmentType', environmentType)
    }
    if (namespace) {
      setContextValue(this, 'namespace', namespace)
    }
    if (workload) {
      setContextValue(this, 'workload', workload)
    }

    if (!this.environmentType) {
      throw new Error(
        '"environmentType" must be specified either via props or parent context.'
      )
    }
    if (!this.namespace) {
      throw new Error(
        '"namespace" must be specified either via props or parent context.'
      )
    }
    if (!this.workload) {
      throw new Error(
        '"workload" must be specified either via props or parent context.'
      )
    }

    this.tags.setTag('environment', this.environmentType)
    this.tags.setTag('namespace', this.namespace)
    this.tags.setTag('workload', this.workload)
  }

  /**
   * Looks up the first stack scope in which construct is defined. Fails if there is no stack up the tree or
   * if the stack is not of the correct type.
   */
  public static of(construct: IConstruct): Stack {
    const stack = cdk.Stack.of(construct)
    if (stack instanceof Stack) {
      return stack
    } else {
      throw new Error('Uncrecognized stack type.')
    }
  }

  // Context Helpers

  /**
   * Given a context value's short name, return the value using it's fully-scoped key. If the value does not
   * exist, the default will be returned. If no default is provided, an error is thrown.
   */
  public getContextValue<T = unknown>(name: string, defaultValue?: T): T {
    return getContextValue(this, name, defaultValue)
  }

  /**
   * Given a context value's short name, return the value using it's fully-scoped key. If the value does not
   * exist, the default will be returned. If no default is provided, an error is thrown.
   */
  public getContextString(name: string, defaultValue?: string): string {
    return getContextString(this, name, defaultValue)
  }

  // workload and instance metadata

  public get environmentType(): EnvironmentType {
    return getContextEnum(this, 'environmentType', EnvironmentTypes)
  }

  public get namespace(): string {
    return getContextValue(this, 'namespace', 'default')
  }

  public get workload(): string {
    return getContextValue(this, 'workload')
  }

  // SSM helpers

  /**
   * Given either a parameter name, or a component/parameter pair, return an SSM path scoped to this stack's instance and workload.
   *
   * @example this.getSsmPath('component', 'parameter')
   * @example this.getSsmPath('parameter')
   * @param componentOrParameter component portion of the ssm path, if maybeParamter is defined; otherwise, the parameter portion
   * @param maybeParameter parameter portion of the ssm path, if a component is specified
   * @returns the ssm path
   */
  public getSsmPath(componentOrParameter: string, maybeParameter?: string) {
    const parts =
      maybeParameter === undefined
        ? { parameter: componentOrParameter }
        : { component: componentOrParameter, parameter: maybeParameter }

    return getSsmPath({
      ...parts,
      scope: this,
    })
  }
}
