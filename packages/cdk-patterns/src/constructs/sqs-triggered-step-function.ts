import path from 'node:path'

import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambda_events from 'aws-cdk-lib/aws-lambda-event-sources'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import { Construct } from 'constructs'

import {
  createTemplate,
  EventMappingDefinition,
} from '../handler-assets/sqs-step-function-trigger'

import { BaseConstruct } from './base-construct'

export type SqsTriggeredStepFunctionProps = {
  /**
   * Optional mapping specifying how incoming SQS messages should be translated into input
   * objects for the step function.
   *
   * Each key defined in the mapping defines a property that will be present on the step
   * function input. The value of the property is the value defined in the mapping. If this
   * value is a mustache template (https://github.com/janl/mustache.js), then it will be
   * rendered using the SQS message as the view object. Finally, if any rendered values
   * are valid booleans or numbers, they will be converted to that type. Otherwise, all
   * values are strings.
   *
   * For example, given the following SQS message:
   *
   * ```
   * {
   *   value1: 'one',
   *   value2: true,
   *   value3: {
   *     isDeep: 5,
   *     why: 'just because',
   *   }
   * }
   * ```
   *
   * and the following value for `eventMapping`:
   *
   * ```
   * {
   *   type: 'mapped',
   *   value1: {
   *     original: '{{ value1 }}',
   *   },
   *   others: {
   *     second: '{{ value2 }}',
   *     third: '{{ value3.isDeep }}',
   *   },
   *   all: '{{ value1 }}, {{ value2 }}, {{ value3.isDeep }}'
   * }
   * ```
   *
   * then the mapped result passed to the step function will be:
   *
   * ```
   * {
   *   type: 'mapped',
   *   value1: {
   *     original: 'one',
   *   },
   *   others: {
   *     second: true,
   *     third: 5,
   *   },
   *   all: 'one, true, 5'
   * }
   * ```
   *
   * See the unit tests for the handler-assets/sqs-step-function-trigger.ts module for more examples.
   *
   * @default SQS messages are passed directly as inputs, without alteration
   */
  eventMapping?: EventMappingDefinition

  /**
   * Optional set of extra properties to pass to the created SQS EventSource.
   */
  eventSourceProps?: lambda_events.SqsEventSourceProps

  /** SQS queue to which CICD commands are posted */
  queue: sqs.Queue

  /**
   * Definition of the state machine of the created step function.
   **/
  stateMachineDefinition: sfn.IChainable

  /**
   * Optional set of extra properties to pass to the created step function.
   */
  stepFunctionProps?: Partial<Omit<sfn.StateMachineProps, 'definition'>>

  /**
   * Optional set of extra properties to pass to the created trigger lambda.
   */
  triggerLambdaProps?: Partial<Omit<lambda.FunctionProps, 'code' | 'handler'>>
}

/**
 * Creates a StepFunction that is triggered whenever events are posted to an SQS queue.
 */
export class SqsTriggeredStepFunction extends BaseConstruct {
  private _stepFunction: sfn.StateMachine
  private _trigger: lambda.Function

  constructor(
    scope: Construct,
    id: string,
    {
      eventMapping,
      eventSourceProps,
      queue,
      stateMachineDefinition,
      stepFunctionProps = {},
      triggerLambdaProps = {},
    }: SqsTriggeredStepFunctionProps
  ) {
    super(scope, id)

    // create the step function to invoke
    this._stepFunction = new sfn.StateMachine(this, 'StepFunction', {
      ...stepFunctionProps,
      definition: stateMachineDefinition,
    })

    // create the lambda that will trigger the sfn, since sfns can't be directly triggered by sqs
    this._trigger = new lambda.Function(this, 'Trigger', {
      ...triggerLambdaProps,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'dist')),
      handler: 'sqs-step-function-trigger.handler',
      runtime: triggerLambdaProps.runtime ?? lambda.Runtime.NODEJS_16_X,
      environment: {
        ...(triggerLambdaProps.environment ?? {}),
        ...(eventMapping === undefined
          ? {}
          : {
              INPUT_MAPPING: createTemplate(eventMapping),
            }),
        STEP_FUNCTION_ARN: this._stepFunction.stateMachineArn,
      },
    })

    // disable batching due to verify low message rate the fact that the lambda completes almost instantly
    this._trigger.addEventSource(
      new lambda_events.SqsEventSource(queue, eventSourceProps)
    )

    if (this._trigger.role) {
      this._stepFunction.grantStartExecution(this._trigger.role)
    }
  }

  /**
   * The created Step Function resource
   */
  public get stepFunction(): sfn.StateMachine {
    return this._stepFunction
  }

  /**
   * The created lambda, used to trigger the step function when SQS messages arrive
   */
  public get trigger(): lambda.Function {
    return this._trigger
  }
}
