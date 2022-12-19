import path from 'node:path'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import { Construct } from 'constructs'

import { pascalCase } from '../utils/pascal-case'
import { randomString } from '../utils/random-string'
import { ILogGroup } from 'aws-cdk-lib/aws-logs'
import { constructIdToShortName } from '../utils/resource-names'

export type TaskDefinitionProps = ecs.FargateTaskDefinitionProps & {
  /**
   * Log group to send container logs to by default. Can be overridden by setting a custom logger for`s
   * individual containers if needed.
   */
  logGroup?: ILogGroup | undefined
}

export type PackageContainerDefinitionOptions = Omit<
  ecs.ContainerDefinitionOptions,
  'image'
>

export type SharedVolumeProps = {
  /**
   * The path on the container to mount the volume at.
   */
  containerPath: string

  /**
   * The name of the shared volume. Defaults to a random string.
   */
  name: string
}

export class TaskDefinition extends Construct {
  /** all containers which have been added to the task definition */
  private _containers: ecs.ContainerDefinition[] = []

  /** logging to apply to all containers */
  private _logging: ecs.LogDriver | undefined

  /** mountpoints for shared volumes to add to all containers */
  private _sharedVolumes: ecs.MountPoint[] = []

  /** underlying task definition from cdk lib */
  private _taskDefinition: ecs.FargateTaskDefinition

  constructor(
    scope: Construct,
    id: string,
    { logGroup, ...rest }: TaskDefinitionProps
  ) {
    super(scope, id)

    this._taskDefinition = new ecs.FargateTaskDefinition(this, 'Default', rest)

    const taskName = constructIdToShortName(id, { suffix: 'task' })
    this._logging =
      logGroup === undefined
        ? undefined
        : ecs.LogDrivers.awsLogs({
            streamPrefix: `${taskName}-containers`,
            logGroup,
          })
  }

  /**
   * Gets the underlying ecs.TaskDefinition created by this Construct.
   */
  public get taskDefinition() {
    return this._taskDefinition
  }

  /**
   * Adds a new container to the task definition.
   */
  public addContainer(
    id: string,
    props: ecs.ContainerDefinitionOptions
  ): ecs.ContainerDefinition {
    const container = this._taskDefinition.addContainer(id, {
      logging: this._logging,
      ...props,
    })
    this._containers.push(container)

    container.addMountPoints(...this._sharedVolumes)

    return container
  }

  /**
   * Given the path to a package containing a Dockerfile, add a new container using the image
   * built by that Dockerfile. The props are passed to the container definition to allow it to
   * be customized. The following default options are set, but can be overridden:
   *
   *   - containerName: basename of the package path, with any '-image' suffix removed
   *   - readonlyRootFilesystem: true
   *
   * @param path absolute path to the container image's package
   */
  public addContainerFromPackage(
    packagePath: string,
    props: PackageContainerDefinitionOptions = {}
  ): ecs.ContainerDefinition {
    const id = path.basename(packagePath).replace(/-image$/, '')
    const constructId = `${pascalCase(id)}Container`

    return this.addContainer(constructId, {
      containerName: id,
      readonlyRootFilesystem: true,
      ...props,
      image: ecs.ContainerImage.fromAsset(packagePath),
    })
  }

  /**
   * Creates a volume that is mounted at the same path in all containers.
   *
   * @param containerPath the path within containers to mount the volume
   * @param name name of the volume, which defaults to a random string
   */
  public addSharedVolume({
    containerPath,
    name = randomString(16),
  }: SharedVolumeProps): void {
    this._taskDefinition.addVolume({
      name,
    })

    const sharedVolume = {
      containerPath,
      readOnly: false,
      sourceVolume: name,
    }

    this._containers.forEach((container) => {
      container.addMountPoints(sharedVolume)
    })

    this._sharedVolumes.push(sharedVolume)
  }
}
