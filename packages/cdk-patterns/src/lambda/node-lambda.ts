import * as lambda from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'

export type NodeVersion = 14 | 16 | 18

export type LambdaFunctionProps = {
  asset: {
    /** absolute path to the directory containing the transpiled lambda */
    directory: string

    /** name of the Javascript file (without the .js extension) containing the handler */
    fileName: string

    /** name of the export function to use as the lambda handler */
    functionName: string
  }

  /** Option props to pass to the underlying lambda.Function Construct */
  functionProps?: Omit<lambda.FunctionProps, 'code' | 'handler' | 'runtime'>

  /** node version to use as the runtime, defaults to 16 */
  nodeVersion?: NodeVersion
}

const getRuntime = (nodeVersion: NodeVersion): lambda.Runtime => {
  switch (nodeVersion) {
    case 14:
      return lambda.Runtime.NODEJS_14_X
    case 16:
      return lambda.Runtime.NODEJS_16_X
    case 18:
      return lambda.Runtime.NODEJS_18_X
  }
}

export class NodeLambda extends Construct {
  /** underlyign Function construct */
  public readonly lambdaFunction: lambda.Function

  public constructor(
    scope: Construct,
    id: string,
    { asset, functionProps = {}, nodeVersion = 16 }: LambdaFunctionProps
  ) {
    super(scope, id)

    this.lambdaFunction = new lambda.Function(this, 'Default', {
      ...functionProps,
      code: lambda.Code.fromAsset(asset.directory),
      handler: `${asset.fileName}.${asset.functionName}`,
      runtime: getRuntime(nodeVersion),
    })
  }
}
