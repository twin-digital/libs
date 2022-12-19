import * as cdk from 'aws-cdk-lib'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { kebabCase } from 'lodash/fp'

import { BaseConstruct } from './base-construct'
import { ConstructConstructor } from '../types'

export type ManagedPoliciesProps = {
  /**
   * The set of policies to manage. Duplicates are not allowed and will result in an error.
   */
  policies: ConstructConstructor<iam.ManagedPolicy, iam.ManagedPolicyProps>[]
}

/**
 * Gets the name under which a managed policy's ARN should be exported, given the ManagedPolicy constructor.
 */
const getExportName = (policyType: ConstructConstructor<iam.ManagedPolicy>) =>
  `managed-policy:${kebabCase(policyType.name)}:arn`

/**
 * Instantiates a collection of iam.ManagedPolicy Constructs, and saves their ARNs as outputs that can be retrieved
 * later as cross-stack references.
 */
export class ManagedPolicies extends BaseConstruct {
  constructor(
    scope: Construct,
    id: string,
    { policies }: ManagedPoliciesProps
  ) {
    super(scope, id)

    // create policies and export ARNs
    policies.forEach((PolicyType) => {
      const policy = new PolicyType(this, PolicyType.name, {
        managedPolicyName: this.getResourceName(
          kebabCase(PolicyType.name),
          iam.ManagedPolicy
        ),
      })

      // save the poilcy ARN as an output
      new cdk.CfnOutput(this, `${PolicyType.name}ArnOutput`, {
        value: policy.managedPolicyArn,
        description: `ARN of the ${PolicyType.name} policy`,
        exportName: getExportName(PolicyType),
      })
    })
  }

  /**
   * Given it's class type, looks up the ARN of a managed policy created in another stack and returns it.
   */
  public static lookup<T extends ConstructConstructor<iam.ManagedPolicy>>(
    scope: Construct,
    id: string,
    policyType: T
  ): iam.IManagedPolicy {
    const arn = cdk.Fn.importValue(getExportName(policyType))
    return iam.ManagedPolicy.fromManagedPolicyArn(scope, id, arn)
  }
}
