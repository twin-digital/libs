import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { setContextValue } from '../utils/context'

export type StageProps = cdk.StageProps & {
  /**
   * The name of the 'environment' type (i.e. dev, qa, prod, etc.) for this stage.
   */
  environmentType?: string

  /**
   * Qualifier used to separate resources from parallel deployments of the same workload.
   */
  namespace?: string

  /**
   * The name of the workload (i.e. app, service, etc.) this stage is a part of.
   */
  workload?: string
}

export class Stage extends cdk.Stage {
  constructor(
    scope: Construct,
    id: string,
    { environmentType, namespace, workload, ...props }: StageProps
  ) {
    super(scope, id, props)

    if (environmentType) {
      setContextValue(this, 'environmentType', environmentType)
    }
    if (namespace) {
      setContextValue(this, 'namespace', namespace)
    }
    if (workload) {
      setContextValue(this, 'workload', workload)
    }
  }
}
