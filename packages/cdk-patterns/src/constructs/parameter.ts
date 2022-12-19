import * as ssm from 'aws-cdk-lib/aws-ssm'
import { Construct } from 'constructs'
import { getSsmPath, SsmPathOptions } from '../utils/get-ssm-path'
import { BaseConstruct } from './base-construct'

/**
 * Determines whether a resource should create a new parameter with a specific value, or lookup
 * the value of a parameter that has been previously created.
 */
export type ParameterMode = 'create' | 'lookup'

export type ParameterCreateProps = {
  /**
   * When mode is 'create' (the default), a parameter is created and the value is required.
   */
  mode?: 'create' | undefined

  /**
   * The value for a new parameter.
   */
  stringValue: string
}

export type ParameterLookupProps = {
  /**
   * When mode is 'lookup', no value can be provided and the parameter is retrieved from the
   * AWS account.
   */
  mode: 'lookup'
}

export type ParameterProps = Omit<
  ssm.StringParameterProps,
  'parameterName' | 'stringValue'
> &
  Pick<SsmPathOptions, 'component' | 'parameter'> &
  (ParameterCreateProps | ParameterLookupProps)

/**
 * Creates an SSM parameter using the common path structure defined by 'getSsmPath', using this construct as the scope.
 */
export class Parameter extends BaseConstruct {
  /** Underlying cdk construct */
  private _parameter: ssm.IStringParameter

  constructor(
    scope: Construct,
    id: string,
    { component, parameter, ...props }: ParameterProps
  ) {
    super(scope, id)

    if (props.mode === 'create' || props.mode === undefined) {
      this._parameter = new ssm.StringParameter(this, 'Param', {
        ...props,
        parameterName: getSsmPath({ scope: this, component, parameter }),
      })
    } else {
      this._parameter = ssm.StringParameter.fromStringParameterName(
        this,
        'Param',
        getSsmPath({ scope: this, component, parameter })
      )
    }
  }

  /**
   * Gets the underlying IParameter instance.
   */
  public get parameter(): ssm.IParameter {
    return this._parameter
  }

  /**
   * Retrieves the string value of the parameter.
   */
  public get value(): string {
    return this._parameter.stringValue
  }
}
