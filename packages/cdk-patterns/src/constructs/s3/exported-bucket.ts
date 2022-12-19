import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'

import { BaseConstruct } from '../base-construct'
import { Parameter } from '../parameter'

import { Bucket, BucketProps } from './bucket'

export type BucketAttributeExportOption =
  | 'bucket-name'
  | 'read-only-policy-arn'
  | 'read-write-policy-arn'

export type ExportedBucketProps = {
  /**
   * Unique prefix to use when naming the bucket. The name of the created bucket
   * will be '<bucketNamePrefix>-<component>'.
   */
  bucketNamePrefix: string

  /**
   * Any additional properties to pass to the underlying Bucket construct.
   */
  bucketProps?: Omit<BucketProps, 'bucketName' | 'removalPolicy'>

  /**
   * Name of the component within the system for which this bucket provides storage. The component name is used
   * to generate the bucket name, and is used as the 'component' portion of the path for all created SSM Parameters.
   *
   * The name of the created bucket will be '<bucketNamePrefix>-<component>'.
   */
  component: string

  /**
   * Array of bucket attributes which should be stored as CloudFormation outputs.
   *
   *   - bucket-name: store the bucket name
   *   - read-only-policy-arn: store the ARN of the IAM managed policy allowing read-only access to the bucket
   *   - read-write-policy-arn: store the ARN of the IAM managed policy allowing read/write access to the bucket
   *
   * By default, no outputs are created.
   */
  createCloudFormationOutputs?: BucketAttributeExportOption[]

  /**
   * Array of bucket attributes which should be stored in SSM for consumption by other CDK stacks. Possible options are:
   *
   *   - bucket-name: store the bucket name
   *   - read-only-policy-arn: store the ARN of the IAM managed policy allowing read-only access to the bucket
   *   - read-write-policy-arn: store the ARN of the IAM managed policy allowing read/write access to the bucket
   *
   * The SSM parameter paths are created via the 'getSsmPath' function from @twin-digital/cdk-patterns. The component
   * is the 'component' property passed to this construct, and the parameter name is the name of the export option.
   *
   * By default, no parameters are created.
   */
  createSsmParameters?: BucketAttributeExportOption[]
}

/**
 * Creates an S3 bucket for storing CI artifacts, and exposes the bucket and related IAM policies via
 * SSM and CloudFormation outputs.
 */
export class ExportedBucket extends BaseConstruct {
  /** policy allowing reading of release artifacts */
  public readonly readOnlyPolicy: iam.ManagedPolicy

  /** policy allowing reading and writing of release artifacts */
  public readonly readWritePolicy: iam.ManagedPolicy

  /** S3 bucket to use for release artifact storage */
  public readonly bucket: Bucket

  constructor(
    scope: Construct,
    id: string,
    {
      bucketNamePrefix,
      bucketProps = {},
      component,
      createCloudFormationOutputs = [],
      createSsmParameters = [],
    }: ExportedBucketProps
  ) {
    super(scope, id)

    this.bucket = new Bucket(this, 'Bucket', {
      ...bucketProps,
      bucketName: `${bucketNamePrefix}-${component}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    this.readOnlyPolicy = this.bucket.readOnlyPolicy
    this.readWritePolicy = this.bucket.readWritePolicy

    // create SSM parameters for "exported" resources and values

    if (createSsmParameters.includes('bucket-name')) {
      new Parameter(this, 'BucketName', {
        component,
        description: `Name of the ${component} S3 bucket`,
        parameter: 'bucket-name',
        stringValue: this.bucket.bucket.bucketName,
      })
    }

    if (createSsmParameters.includes('read-only-policy-arn')) {
      new Parameter(this, 'ReadOnlyPolicyArn', {
        component,
        description: `ARN of the managed policy allowing read-only access to the ${component} bucket`,
        parameter: 'read-only-policy-arn',
        stringValue: this.bucket.readOnlyPolicy.managedPolicyArn,
      })
    }

    if (createSsmParameters.includes('read-write-policy-arn')) {
      new Parameter(this, 'ReadWritePolicyArn', {
        component,
        description: `ARN of the managed policy allowing read/write access to the ${component} bucket`,
        parameter: 'read-write-policy-arn',
        stringValue: this.bucket.readWritePolicy.managedPolicyArn,
      })
    }

    // create outputs for values that need to be easily exported to other environments (i.e. GitHub)

    if (createCloudFormationOutputs.includes('bucket-name')) {
      new cdk.CfnOutput(this, 'BucketNameOutput', {
        description: `Name of the ${component} S3 bucket`,
        value: this.bucket.bucket.bucketName,
      })
    }

    if (createCloudFormationOutputs.includes('read-only-policy-arn')) {
      new cdk.CfnOutput(this, 'ReadOnlyPolicyArnOutput', {
        description: `ARN of the managed policy allowing read-only access to the ${component} bucket`,
        value: this.bucket.readOnlyPolicy.managedPolicyArn,
      })
    }

    if (createCloudFormationOutputs.includes('read-write-policy-arn')) {
      new cdk.CfnOutput(this, 'ReadWritePolicyArnOutput', {
        description: `ARN of the managed policy allowing read/write access to the ${component} bucket`,
        value: this.bucket.readWritePolicy.managedPolicyArn,
      })
    }
  }
}
