import { Stack } from 'aws-cdk-lib'
import * as codeartifact from 'aws-cdk-lib/aws-codeartifact'
import { Construct } from 'constructs'
import { size } from 'lodash/fp'
import { CodeArtifactDomain } from './code-artifact-domain'

/**
 * Properties used to configure how a new repository is added to a domain.
 */
export type CodeArtifactRepositoryProps = {
  /** CodeArtifact domain to add the repository to */
  domain: CodeArtifactDomain

  /** name of the repository to create */
  repositoryName: string

  /**
   * Additional properties to apply to the repository
   **/
  repositoryProps?: Omit<
    codeartifact.CfnRepositoryProps,
    'domainName' | 'repositoryName'
  >

  /**
   * Optional list of account IDs which will be trusted for this repository. Trusted accounts will be allowed to
   * generate read and write packages in the new repository.
   **/
  trustedAccounts?: string[]
}

export class CodeArtifactRepository extends Construct {
  // actions for reading repository metadata, but not package information or assets
  public static RepositoryReadActions = ['codeartifact:DescribeRepository']

  // actions needed at the repository level to enable reading packages
  public static PackageReadActions = [
    'codeartifact:GetRepositoryEndpoint',
    'codeartifact:ListPackages',
    'codeartifact:ReadFromRepository',
  ]

  /** Parent CodeArtifact domain */
  public readonly domain: CodeArtifactDomain

  /** ARNs which reference packages contained in this repository */
  public readonly packageArns: string[]

  /** ARN of the CodeArtifact domain */
  public readonly repositoryArn: string

  /** name of the CodeArtifact repository */
  public readonly repositoryName: string

  /**
   * List of account IDs which will be trusted for this domain. Trusted accounts will be allowed to
   * generate authorization tokens and have read/write access to repositories in this domain.
   */
  public readonly trustedAccounts: string[]

  public constructor(
    scope: Construct,
    id: string,
    {
      domain,
      repositoryName,
      repositoryProps = {},
      trustedAccounts = [],
    }: CodeArtifactRepositoryProps
  ) {
    super(scope, id)

    const stack = Stack.of(this)

    this.domain = domain
    this.packageArns = [
      // with namespace
      `arn:aws:codeartifact:${stack.region}:${stack.account}:package/${this.domain.domainName}/${repositoryName}/*/*/*`,
      // without namespace (required, or is above enough?)
      `arn:aws:codeartifact:${stack.region}:${stack.account}:package/${this.domain.domainName}/${repositoryName}/*//*`,
    ]
    this.repositoryArn = `arn:aws:codeartifact:${stack.region}:${stack.account}:repository/${this.domain.domainName}/${repositoryName}`
    this.repositoryName = repositoryName
    this.trustedAccounts = trustedAccounts

    const repository = new codeartifact.CfnRepository(this, `Default`, {
      ...repositoryProps,
      domainName: this.domain.domainName,
      repositoryName,
    })

    if (size(trustedAccounts) > 0) {
      repository.permissionsPolicyDocument = {
        Version: '2012-10-17',
        Statement: {
          Action: [
            ...CodeArtifactRepository.PackageReadActions,
            ...CodeArtifactRepository.RepositoryReadActions,
          ],
          Effect: 'Allow',
          Principal: {
            AWS: trustedAccounts,
          },
          Resource: this.repositoryArn,
          Sid: 'AllowTrustedAccounts',
        },
      }
    }

    repository.addDependsOn(this.domain.domain)
  }
}
