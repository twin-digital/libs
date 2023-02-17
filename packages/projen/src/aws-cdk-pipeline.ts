import path from 'node:path'
import { FileBase } from 'projen'
import { TypeScriptProject } from 'projen/lib/typescript'

export type AwsCdkPipelineProps = {
  /**
   * AWS role to assume for retrieving CodeArtifact packages
   *
   * @default CodeArtifact access is not configured
   */
  codeArtifactRole?: string

  /**
   * Branch for which pushes will trigger deployments.
   *
   * @default "main"
   */
  deploymentBranch?: string

  /**
   * Version of nodejs to use when building deployment artifacts.
   *
   * @default project's max node version, then project's min node version, then none
   */
  nodeVersion?: string

  /**
   * AWS role to use when executing the CDK pipeline. Will authenticate using Github OIDC.
   */
  deploymentRole: string

  /**
   * Name of the created deployment workflow file
   *
   *  @default "deploy.yml"
   */
  workflowFileName?: string

  /**
   * Name of the created deployment workflow
   *
   *  @default "deploy"
   */
  workflowName?: string
}

export class AwsCdkPipeline extends FileBase {
  private codeArtifactRole?: string
  private deploymentBranch?: string
  private deploymentRole: string
  private nodeVersion?: string
  private typescriptProject: TypeScriptProject
  private workflowName: string
  private workflowPath: string

  public constructor(
    project: TypeScriptProject,
    {
      codeArtifactRole,
      deploymentBranch = 'main',
      deploymentRole,
      nodeVersion,
      workflowFileName = 'deploy-cdk.yml',
      workflowName = 'deploy',
    }: AwsCdkPipelineProps
  ) {
    super(project, path.join(project.srcdir, 'cdk-pipeline.ts'))

    this.codeArtifactRole = codeArtifactRole
    this.deploymentBranch = deploymentBranch
    this.deploymentRole = deploymentRole
    this.nodeVersion = nodeVersion
    this.typescriptProject = project
    this.workflowName = workflowName
    this.workflowPath = `.github/workflows/${workflowFileName}`
  }

  protected synthesizeContent(): string | undefined {
    const preSteps = [] as string[]

    const resolvedNodeVersion =
      this.nodeVersion ??
      this.typescriptProject.maxNodeVersion ??
      this.typescriptProject.minNodeVersion
    if (resolvedNodeVersion) {
      preSteps.push(`{
          name: 'Setup Node.js',
          uses: 'actions/setup-node@v3',
          with: { 'node-version': '${resolvedNodeVersion}' },
        },`)
    }

    if (this.codeArtifactRole) {
      preSteps.push(`        {
          name: 'Configure AWS Credentials',
          uses: 'aws-actions/configure-aws-credentials@v1',
          with: {
            'aws-region': 'us-east-2',
            'role-to-assume': '${this.codeArtifactRole}',
          },
        },
        {
          name: 'AWS CodeArtifact Login',
          run: '${this.typescriptProject.runScriptCommand} ca:login',
        },`)
    }

    return `${
      this.marker ? '//' + this.marker + '\n\n' : ''
    }import { ShellStep } from 'aws-cdk-lib/pipelines'
import { AwsCredentials, GitHubWorkflow } from 'cdk-pipelines-github'
import { Construct } from 'constructs'

export class CdkPipeline extends GitHubWorkflow {
  public constructor(scope: Construct) {
    super(scope, 'Pipeline', {
      awsCreds: AwsCredentials.fromOpenIdConnect({
        gitHubActionRoleArn: '${this.deploymentRole}',
      }),
      preBuildSteps: [
        ${preSteps.join('\n')}
      ],
      synth: new ShellStep('Build', {
        commands: ['${this.typescriptProject.package.installCommand}', '${
      this.typescriptProject.runScriptCommand
    } build'],
      }),
      workflowName: '${this.workflowName}',
      workflowPath: '${this.workflowPath}',
      workflowTriggers: {
        push: {
          branches: ['${this.deploymentBranch}'],
        },
        workflowDispatch: {},
      },
    })
  }
}
`
  }
}
