import * as sns from 'aws-cdk-lib/aws-sns'
import * as sqs from 'aws-cdk-lib/aws-sqs'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'

import { Construct } from 'constructs'

export type SnsToSqsAdapterProps = {
  /**
   * @see subscriptions.SqsSubscriptionProps#deadLetterQueue
   */
  deadLetterQueue?: subscriptions.SqsSubscriptionProps['deadLetterQueue']

  /**
   * @see subscriptions.SqsSubscriptionProps#filterPolicy
   */
  filterPolicy?: subscriptions.SqsSubscriptionProps['filterPolicy']

  /**
   * Optional set of props to pass to the created SQS queue. The following are set by default, but can be overidden:
   *
   *   - eduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP
   *   - fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID
   *
   * The queue is always a FIFO queue, and this cannot be changed.
   */
  queueProps?: Omit<sqs.QueueProps, 'fifo'>

  /**
   * @see subscriptions.SqsSubscriptionProps#rawMessageDelivery
   */
  rawMessageDelivery?: subscriptions.SqsSubscriptionProps['rawMessageDelivery']

  /** ARN of the topic to subscribe to */
  topicArn: string
}

/**
 * Creates a FIFO SQS queue which subscribes to a FIFO SNS topic, effectively converting push-based notifications
 * into a pull-based queue. The topic must already exist (and will be retrieved via ARN), but the queue is created
 * by this construct.
 */
export class SnsToSqsAdapter extends Construct {
  /** underlying Queue construct which has been created */
  public readonly queue: sqs.Queue

  /** underlying Topic construct which the queue subscribes to */
  public readonly topic: sns.ITopic

  constructor(
    scope: Construct,
    id: string,
    {
      deadLetterQueue,
      filterPolicy,
      rawMessageDelivery,
      queueProps = {},
      topicArn,
    }: SnsToSqsAdapterProps
  ) {
    super(scope, id)

    this.queue = new sqs.Queue(this, 'Queue', {
      deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
      fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
      ...queueProps,
      fifo: true,
    })

    this.topic = sns.Topic.fromTopicArn(this, 'Topic', topicArn)

    this.topic.addSubscription(
      new subscriptions.SqsSubscription(this.queue, {
        deadLetterQueue,
        filterPolicy,
        rawMessageDelivery,
      })
    )
  }
}
