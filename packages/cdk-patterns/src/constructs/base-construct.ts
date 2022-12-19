import { Construct } from 'constructs'
import { ConstructConstructor } from '../types'
import {
  getContextEnum,
  getContextString,
  getContextValue,
} from '../utils/context'
import { EnvironmentType, EnvironmentTypes } from '../utils/environment'
import {
  getResourceName,
  GetResourceNameOptions,
} from '../utils/resource-names'

export class BaseConstruct extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id)
  }

  protected getResourceName(
    shortName: string,
    type?: ConstructConstructor | undefined,
    options?: GetResourceNameOptions
  ) {
    return getResourceName(this, shortName, type, options)
  }

  // Context Helpers

  /**
   * Given a context value's short name, return the value using it's fully-scoped key. If the value does not
   * exist, the default will be returned. If no default is provided, an error is thrown.
   */
  protected getContextValue<T = unknown>(name: string, defaultValue?: T): T {
    return getContextValue(this, name, defaultValue)
  }

  /**
   * Given a context value's short name, return the value using it's fully-scoped key. If the value does not
   * exist, the default will be returned. If no default is provided, an error is thrown.
   */
  protected getContextString(name: string, defaultValue?: string): string {
    return getContextString(this, name, defaultValue)
  }

  /**
   * Given a context value's short name, return the value from context using it's fully scoped key. If the value
   * is not in the supplied set of allowed values, an error will be thrown. If the value does not exist, the default
   * will be returned. If no default is provided, an error is thrown.
   */
  protected getContextEnum<T extends readonly unknown[]>(
    name: string,
    allowedValues: T,
    defaultValue?: T[number]
  ): T[number] {
    return getContextEnum(this, name, allowedValues, defaultValue)
  }

  // workload and instance metadata

  protected get environmentType(): EnvironmentType {
    return this.getContextEnum('environmentType', EnvironmentTypes)
  }

  protected get namespace(): string {
    return this.getContextValue('namespace', 'default')
  }

  protected get workload(): string {
    return this.getContextValue('workload')
  }
}
