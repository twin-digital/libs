import { Stack } from 'aws-cdk-lib'
import * as codeartifact from 'aws-cdk-lib/aws-codeartifact'
import * as iam from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import { capitalize } from 'lodash/fp'
import {
  CodeArtifactRepository,
  CodeArtifactRepositoryProps,
} from './code-artifact-repository'

export type CodeArtifactDomainProps = {
  /** Name of the CodeArtifact domain to create */
  domainName: string

  /** Additional properties to apply to the domain */
  domainProps?: Omit<codeartifact.CfnDomainProps, 'domainName'>

  /**
   * Optional list of account IDs which will be trusted for this domain. Trusted accounts will be allowed to
   * generate authorization tokens and have read/write access to repositories in this domain.
   *
   * @default no trusted accounts
   **/
  trustedAccounts?: string[]
}

/**
 * Properties used to configure how a new repository is added to a domain.
 */
export type AddCodeArtifactRepositoryProps = Omit<
  CodeArtifactRepositoryProps,
  'domain'
>

export class CodeArtifactDomain extends Construct {
  /** underlying L1 domain construct */
  public readonly domain: codeartifact.CfnDomain

  /** ARN of the CodeArtifact domain */
  public readonly domainArn: string

  /** name of the CodeArtifact domain */
  public readonly domainName: string

  /**
   * List of account IDs which will be trusted for this domain. Trusted accounts will be allowed to
   * generate authorization tokens and have read/write access to repositories in this domain.
   */
  public readonly trustedAccounts: string[]

  public constructor(
    scope: Construct,
    id: string,
    {
      domainName,
      domainProps = {},
      trustedAccounts = [],
    }: CodeArtifactDomainProps
  ) {
    super(scope, id)

    const stack = Stack.of(this)

    this.domainArn = `arn:aws:codeartifact:${stack.region}:${stack.account}:domain/${domainName}`
    this.domainName = domainName
    this.trustedAccounts = trustedAccounts

    const permissionsPolicyDocument =
      trustedAccounts.length === 0
        ? undefined
        : {
            Version: '2012-10-17',
            Statement: {
              Action: 'codeartifact:GetAuthorizationToken',
              Effect: 'Allow',
              Principal: {
                AWS: trustedAccounts,
              },
              Resource: this.domainArn,
              Sid: 'AllowTrustedAccounts',
            },
          }

    this.domain = new codeartifact.CfnDomain(this, 'Default', {
      ...domainProps,
      domainName,
      permissionsPolicyDocument,
    })
  }

  /**
   * Adds a new repository to this domain. If no trusted accounts are specified, the repository will trust all
   * accounts trusted by this domain. To explicitly deny trust to external accounts, pass an empty array for the
   * `trustAccounts` props.
   */
  public addRepository({
    trustedAccounts = this.trustedAccounts,
    ...props
  }: AddCodeArtifactRepositoryProps): CodeArtifactRepository {
    return new CodeArtifactRepository(
      this,
      `Repository${capitalize(props.repositoryName)}`,
      {
        ...props,
        trustedAccounts,
        domain: this,
      }
    )
  }

  /**
   * Identity-based policy statements required to generate authorization tokens for this domain.
   */
  public get authorizationTokenPolicies(): iam.PolicyStatement[] {
    return [
      new iam.PolicyStatement({
        actions: ['codeartifact:GetAuthorizationToken'],
        effect: iam.Effect.ALLOW,
        resources: [this.domainArn],
        sid: 'GetAuthorizationToken',
      }),
      // needed for codeartifact:GetAuthorizationToken action
      // See: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_bearer.html
      new iam.PolicyStatement({
        actions: ['sts:GetServiceBearerToken'],
        conditions: {
          StringEquals: {
            'sts:AWSServiceName': 'codeartifact.amazonaws.com',
          },
        },
        effect: iam.Effect.ALLOW,
        resources: ['*'],
        sid: 'AllowServiceBearerToken',
      }),
    ]
  }
}
