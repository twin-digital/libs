import fs from 'node:fs'
import path from 'node:path'
import { awscdk, Component, javascript } from 'projen'
import { AwsCdkTypeScriptApp } from 'projen/lib/awscdk'
import { ScopedPackagesOptions } from 'projen/lib/javascript'

import { AwsCdkPipeline } from './aws-cdk-pipeline'

export type TwinDigitalCdkAppOptions = Omit<
  awscdk.AwsCdkTypeScriptAppOptions,
  | 'cdkVersion'
  | 'defaultReleaseBranch'
  | 'mutableBuild'
  | 'projenrcTs'
  | 'release'
  | 'scopedPackagesOptions'
> & {
  additionalScopedPackages?: ScopedPackagesOptions[]
  cdkVersion?: string
  defaultReleaseBranch?: string
}

const DEFAULTS = {
  AUTHOR_EMAIL: 'sean@twindigital.io',
  AUTHOR_NAME: 'Sean Kleinjung',
  CDK_VERSION: '2.64.0',
  CONSTRUCTS_VERSION: '10.1.249',
  MIN_NODE_VERSION: '16.13.0',
  PRETTIER_OPTIONS: {
    settings: {
      printWidth: 120,
      semi: false,
      singleQuote: true,
    },
  },
}

export class TwinDigitalCdkApp extends awscdk.AwsCdkTypeScriptApp {
  constructor({
    additionalScopedPackages = [],
    authorEmail = DEFAULTS.AUTHOR_EMAIL,
    authorName = DEFAULTS.AUTHOR_NAME,
    cdkVersion = DEFAULTS.CDK_VERSION,
    codeArtifactOptions,
    constructsVersion = DEFAULTS.CONSTRUCTS_VERSION,
    defaultReleaseBranch = 'main',
    githubOptions,
    licensed = false,
    minNodeVersion = DEFAULTS.MIN_NODE_VERSION,
    packageManager = javascript.NodePackageManager.NPM,
    packageName,
    prettier = true,
    prettierOptions = DEFAULTS.PRETTIER_OPTIONS,
    ...props
  }: TwinDigitalCdkAppOptions) {
    super({
      authorEmail,
      authorName,
      cdkVersion,
      codeArtifactOptions,
      constructsVersion,
      defaultReleaseBranch,
      githubOptions: {
        mergify: false,
        ...(githubOptions ?? {}),
      },
      licensed,
      minNodeVersion,
      packageManager,
      packageName: packageName ?? `@twin-digital/${props.name}`,
      prettier,
      prettierOptions,
      ...props,
      deps: [...(props.deps ?? []), 'cdk-pipelines-github'],
      mutableBuild: false,
      projenrcTs: true,
      release: true,
      sampleCode: false,
      scopedPackagesOptions: [
        ...additionalScopedPackages,
        {
          registryUrl:
            'https://twin-digital-934979133063.d.codeartifact.us-east-2.amazonaws.com/npm/shared/',
          scope: '@twin-digital',
        },
      ],
      tsconfig: {
        compilerOptions: {
          noUnusedLocals: false,
        },
      },
    })

    new AwsCdkPipeline(this, {
      codeArtifactRole: codeArtifactOptions?.roleToAssume,
      deploymentRole:
        'arn:aws:iam::934979133063:role/CommonCicd-RootGitHubGithubActionsACC56793-79JE121HOPUG',
    })

    new SamplePipeline(this)
  }
}

class SamplePipeline extends Component {
  private readonly appProject: AwsCdkTypeScriptApp

  constructor(project: AwsCdkTypeScriptApp) {
    super(project)
    this.appProject = project
  }

  public synthesize() {
    const outdir = this.appProject.outdir
    const srcdir = path.join(outdir, this.appProject.srcdir)
    if (
      fs.existsSync(srcdir) &&
      fs.readdirSync(srcdir).filter((x) => x === this.appProject.appEntrypoint)
        .length > 0
    ) {
      return
    }

    const srcCode = `import { App } from 'aws-cdk-lib'
import { CdkPipeline } from './cdk-pipeline'

const app = new App()

new CdkPipeline(app)

app.synth()
`

    fs.mkdirSync(srcdir, { recursive: true })
    fs.writeFileSync(path.join(srcdir, this.appProject.appEntrypoint), srcCode)
  }
}
