import * as events from 'aws-cdk-lib/aws-events'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import { Construct } from 'constructs'
import { pascalCase } from '../utils/pascal-case'

export type S3EventType =
  | 'Object Access Tier Changed'
  | 'Object ACL Updated'
  | 'Object Created'
  | 'Object Deleted'
  | 'Object Restore Completed'
  | 'Object Restore Expired'
  | 'Object Restore Initiated'
  | 'Object Storage Class Changed'
  | 'Object Tags Added'
  | 'Object Tags Deleted'

export type BucketProps = Omit<
  s3.BucketProps,
  'blockPublicAccess' | 'enforceSSL' | 'objectOwnership'
>

export class Bucket {
  /** The CDK s3 bucket construct */
  public readonly bucket: s3.Bucket

  /** Managed policy that allows reading objects in this bucket */
  private _readOnlyPolicy: iam.ManagedPolicy | undefined

  /** Managed policy that allows reading and writing objects in this bucket */
  private _readWritePolicy: iam.ManagedPolicy | undefined

  /** EventBridge rules that have been created for this bucket, via the 'on' function. */
  private _rules: { [k in S3EventType]?: events.Rule } = {}

  constructor(
    private _scope: Construct,
    private _id: string,
    props: BucketProps = {}
  ) {
    this.bucket = new s3.Bucket(this._scope, this._id, {
      ...props,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    })

    // Following todo would require some additional bucket props, for sure
    // TODO: use principal tags to allow repositories to read and write to their artifacts ONLY
    // See: https://lightrun.com/answers/aws-actions-configure-aws-credentials-working-example-of-github-oidc-and-using-session-tags-in-iam-policies
    // See: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html#id_session-tags_adding-assume-role-idp
    // See: https://github.com/aws-actions/configure-aws-credentials#session-tagging
    // See: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-principaltag
  }

  /**
   * Returns a ManagedPolicy which provides read-only access to this bucket, creating one if it
   * does not already exist.
   *
   * @deprecated we are moving away from creating managed policies for single resources
   */
  public get readOnlyPolicy(): iam.ManagedPolicy {
    if (this._readOnlyPolicy === undefined) {
      this._readOnlyPolicy = new iam.ManagedPolicy(
        this._scope,
        `${this._id}ReadOnlyPolicy`,
        {
          description: `Allow read-only access to objects in s3 bucket: ${this.bucket.bucketName}`,
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:GetObject'],
              effect: iam.Effect.ALLOW,
              resources: [`${this.bucket.bucketArn}/*`],
              sid: 'ObjectRead',
            }),
            new iam.PolicyStatement({
              actions: ['s3:GetBucketLocation', 's3:ListBucket'],
              effect: iam.Effect.ALLOW,
              resources: [`${this.bucket.bucketArn}`],
              sid: 'BasicBucketAccess',
            }),
          ],
        }
      )
    }

    return this._readOnlyPolicy
  }

  /**
   * Returns a ManagedPolicy which provides read-write access to this bucket, creating one if it
   * does not already exist.
   *
   * @deprecated we are moving away from creating managed policies for single resources
   */
  public get readWritePolicy(): iam.ManagedPolicy {
    if (this._readWritePolicy === undefined) {
      this._readWritePolicy = new iam.ManagedPolicy(
        this._scope,
        `${this._id}ReadWritePolicy`,
        {
          description: `Allow read/write access to objects in s3 bucket: ${this.bucket.bucketName}`,
          statements: [
            new iam.PolicyStatement({
              actions: ['s3:GetObject', 's3:DeleteObject', 's3:PutObject'],
              effect: iam.Effect.ALLOW,
              resources: [`${this.bucket.bucketArn}/*`],
              sid: 'ObjectReadWrite',
            }),
            new iam.PolicyStatement({
              actions: ['s3:GetBucketLocation', 's3:ListBucket'],
              effect: iam.Effect.ALLOW,
              resources: [`${this.bucket.bucketArn}`],
              sid: 'BasicBucketAccess',
            }),
          ],
        }
      )
    }

    return this._readWritePolicy
  }

  /**
   * Uses EventBridge to send events of the given type to the specified target. If called multiple times with the same event,
   * a single EventBridge rule will be reused for all targets. Created rules will filter on source, detailType, and the bucket
   * name contained in the detail.
   *
   * @param event name of the event 'detailType' to match
   * @param target target that will be sent matching events
   */
  public on(event: S3EventType, target: events.IRuleTarget) {
    const rule = this._findOrCreateRule(event)
    rule.addTarget(target)
  }

  /**
   * If an EventBridge rule of the given type has already been created for this bucket, return it. Otherwise create
   * a new one. Created rules will filter on source, detailType, and the bucket name contained in the detail.
   *
   * @param event name of the event 'detailType' to match
   */
  private _findOrCreateRule(event: S3EventType): events.Rule {
    let rule = this._rules[event]
    if (rule === undefined) {
      rule = new events.Rule(
        this._scope,
        `${this._id}Default${pascalCase(event)}Rule`,
        {
          eventPattern: {
            detail: {
              bucket: {
                name: [this.bucket.bucketName],
              },
            },
            detailType: [event],
            source: ['aws.s3'],
          },
        }
      )

      this._rules[event] = rule
    }

    return rule
  }
}
