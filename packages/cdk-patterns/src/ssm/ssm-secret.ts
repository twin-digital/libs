import * as cdk from 'aws-cdk-lib'
import { Stack } from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { getSsmPath, SsmPathOptions } from './get-ssm-path'

export type SsmSecretProps = {
  /** used to determine the ssm path of the secret */
  ssmPathOptions: Omit<SsmPathOptions, 'scope'>
}

/**
 * Construct representing a SecureString stored in SSM. CDK is unable to write these secrets, but this
 * construct encapsulates the parameter path and ARN, and exports both as CFN outputs. The user is responsible
 * for actually creating these parameters using an out of band process.
 */
export class SsmSecret extends Construct {
  /** SSM path at which the secret must be created (and should be accessed) */
  public readonly ssmPath: string

  /** ARN of the SSM */
  public readonly arn: string

  constructor(
    scope: Construct,
    private _id: string,
    { ssmPathOptions }: SsmSecretProps
  ) {
    super(scope, _id)

    this.ssmPath = getSsmPath({
      ...ssmPathOptions,
      scope: this,
    })

    this.arn = cdk.Arn.format(
      {
        resource: 'parameter',
        // remove initial '/' to avoid doubling it
        resourceName: this.ssmPath.substring(1),
        service: 'ssm',
      },
      Stack.of(this)
    )

    // create an output containing the name of the SSM param that must be created
    new cdk.CfnOutput(this, `${_id}SsmPath`, {
      description: `Path for SSM secret '${_id}' (MUST CREATE MANUALLY)`,
      value: this.ssmPath,
    })
  }

  /**
   * IAM policy statement which allows reading the SSM secret.
   */
  public get readPolicyStatement(): iam.PolicyStatement {
    return new iam.PolicyStatement({
      actions: ['ssm:GetParameters'],
      effect: iam.Effect.ALLOW,
      resources: [this.arn],
      sid: `Read${this._id}`,
    })
  }
}
