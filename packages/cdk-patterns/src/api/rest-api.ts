import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'

import {
  MethodOptions,
  ProxyResourceOptions,
  ResourceOptions,
} from 'aws-cdk-lib/aws-apigateway'
import { compact, isArray, split } from 'lodash/fp'

export type AccountsApiProps = {
  /** ID of the RestApi (API gateway) to register resources with */
  restApiId: string
}

/**
 * Properties used to create a RestApi construct.
 */
export type RestApiProps = {
  /**
   * Lambda to use as the default authorizer for API methods. If not specified, methods are public
   * by default.
   */
  authorizer?: lambda.Function

  /**
   * Optional overrides to use when creating the RestApi construct
   */
  restApiProps?: apigateway.RestApiProps
}

export type BaseApiBuilderOptions = {
  /**
   * Parent resource to use as the root when adding methods, proxies, and resources. The `path` option
   * will be interpreted relative to this resource.
   * @default API root
   */
  parent?: apigateway.IResource

  /**
   * URL path of the method, represented as an array of path components
   * TODO: just take a string and split on '/'
   */
  path: string[]
}

/**
 * Properties used to add a method to a RestApi.
 * @see RestApi.addMethod
 */
export type AddMethodOptions = BaseApiBuilderOptions & {
  /** Indicates whether authorization is required or not (Default: true) */
  authorizationRequired?: boolean

  /** Lambda function which handles calls to this method */
  handler: lambda.Function

  /** HTTP method (default: GET) */
  method?: string

  /** Optional additional options to apply to the method */
  methodOptions?: Omit<MethodOptions, 'authorizer' | 'authorizationType'>
}

/**
 * Properties used to add a proxy to a RestApi.
 * @see RestApi.addProxy
 */
export type AddProxyOptions = Omit<
  ProxyResourceOptions,
  'defaultIntegration' | 'defaultMethodOptions'
> &
  BaseApiBuilderOptions & {
    /** Indicates whether authorization is required or not (Default: true) */
    authorizationRequired?: boolean

    /** Optional additional default options to apply to the proxy methods */
    defaultMethodOptions?: Omit<
      MethodOptions,
      'authorizer' | 'authorizationType'
    >

    /** Lambda function which handles all calls to the proxied resource */
    handler: lambda.Function
  }

/**
 * Properties used to add a Resource to a RestApi.
 * @see RestApi.addResource
 */
export type AddResourceOptions = Omit<
  ResourceOptions,
  'defaultIntegration' | 'defaultMethodOptions'
> &
  BaseApiBuilderOptions & {
    /** Indicates whether authorization is required or not (Default: true) */
    authorizationRequired?: boolean

    /** Optional additional default options to apply to the proxy methods */
    defaultMethodOptions?: Omit<
      MethodOptions,
      'authorizer' | 'authorizationType'
    >
  }

/**
 * An API gateway REST API.
 */
export class RestApi extends Construct {
  /** The underlying apigateway.RestApi construct */
  public readonly api: apigateway.RestApi

  /** Authorizer to use if a method is added that requires authorization. */
  private readonly _authorizer?: apigateway.IAuthorizer

  constructor(
    scope: Construct,
    id: string,
    { authorizer, restApiProps = {} }: RestApiProps = {}
  ) {
    super(scope, id)

    if (authorizer) {
      this._authorizer = new apigateway.TokenAuthorizer(this, 'Authorizer', {
        handler: authorizer,
      })
    }

    this.api = new apigateway.RestApi(this, 'RestApi', restApiProps)
    this.api.root.addMethod('ANY')
  }

  private _getResource(
    resource: apigateway.IResource,
    path: string | string[]
  ): apigateway.IResource {
    if (!isArray(path)) {
      return this._getResource(resource, compact(split('/', path)))
    }

    if (path.length === 0) {
      return resource
    }

    const existingResource = resource.getResource(path[0])
    return this._getResource(
      existingResource ?? resource.addResource(path[0]),
      path.slice(1)
    )
  }

  /**
   * Adds a new method to this API.
   * @returns the new method
   */
  public addMethod({
    authorizationRequired = true,
    handler,
    method = 'GET',
    methodOptions = {},
    parent = this.api.root,
    path,
  }: AddMethodOptions): apigateway.Method {
    const resource = this._getResource(parent, path)
    return resource.addMethod(
      method,
      new apigateway.LambdaIntegration(handler),
      {
        ...methodOptions,
        ...(authorizationRequired ? { authorizer: this._authorizer } : {}),
      }
    )
  }

  /**
   * Adds a new proxy resource to this API.
   * @return the new resource
   */
  public addProxy({
    authorizationRequired = true,
    defaultMethodOptions,
    handler,
    parent = this.api.root,
    path,
  }: AddProxyOptions): apigateway.ProxyResource {
    const resource = this._getResource(parent, path)
    return resource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(handler),
      defaultMethodOptions: {
        ...defaultMethodOptions,
        ...(authorizationRequired ? { authorizer: this._authorizer } : {}),
      },
    })
  }

  /**
   * Adds a new resource (without methods) to this API.
   * @return the new resource
   */
  public addResource({
    parent = this.api.root,
    path,
  }: AddResourceOptions): apigateway.IResource {
    return this._getResource(parent, path)
  }
}
