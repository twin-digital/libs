import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import type { SQSEvent } from 'aws-lambda'

const client = new SFNClient({})

export type SqsToSfnHandlerOptions = {
  /**
   * Given the body of a single SQS message record, create the input that should be sent to the step function.
   * The returned value will be passed to 'JSON.stringify' in order to produce a string for state machine's input.
   *
   * @default the SQS message is passed to the step function unchanged
   */
  getInput?(message: unknown): unknown

  /**
   * The ARN of the step function to invoke. Defaults to the  environment variable.
   */
  stepFunctionArn: string
}

/** Default getInput implementation, does no transformation. */
const identity = (i: unknown) => i

/**
 * Lambda handler function that processes a batch of SQS messages, invoking a step function for
 * each one. The step function, as well as the input date sent to the function, can be specified
 * via the `stepFunctionArn` and `getInput` options, respectively.
 */
export const sqsToSfnHandler =
  ({ getInput = identity, stepFunctionArn }: SqsToSfnHandlerOptions) =>
  async (event: SQSEvent) => {
    for (const record of event.Records) {
      const input = getInput(JSON.parse(record.body))

      const command = new StartExecutionCommand({
        input: JSON.stringify(input),
        stateMachineArn: stepFunctionArn,
      })

      console.log(
        `Starting Step Function. (arn=${stepFunctionArn}, input=${JSON.stringify(
          input,
          null,
          2
        )})`
      )

      await client.send(command)
    }
  }
