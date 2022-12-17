import { TextEncoder } from 'node:util'
import {
  InvocationType,
  InvokeCommand,
  InvokeCommandOutput,
  LambdaClient,
  LogType,
} from '@aws-sdk/client-lambda'
import { APIGatewayProxyEvent } from 'aws-lambda'
import { get, isNumber, isPlainObject, isString } from 'lodash/fp'

const textEncoder = new TextEncoder()
const lambda = new LambdaClient({})

export interface InvokeLambdaOptions {
  /**
   * Name of the lambda function to invoke, in one of the formats accepted by the AWS Lambda Invoke API.
   */
  functionName: string
}

export interface InvokeLambdaResponse<T> {
  data: T
  ok: boolean
  status: number
}

interface InvokeResponsePayload {
  body?: string
  headers?: Record<string, string>
  statusCode: number
}

const createAPIGatewayProxyEvent = (
  options: InvokeLambdaOptions
): Omit<
  APIGatewayProxyEvent,
  'isBase64Encoded' | 'stageVariables' | 'requestContext' | 'resource'
> => {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    path: '',
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
  }
}

const isValidPayload = (
  candidate: unknown
): candidate is InvokeResponsePayload => {
  const body = get('body', candidate)
  const headers = get('headers', candidate)
  const statusCode = get('statusCode', candidate)

  return (
    (body === undefined || isString(body)) &&
    (headers === undefined || isPlainObject(headers)) &&
    isNumber(statusCode)
  )
}

const parsePayload = (
  payload: InvokeCommandOutput['Payload']
): InvokeResponsePayload => {
  if (payload === undefined) {
    throw new Error('Invalid lambda response: payload was undefined')
  }

  const parsed = JSON.parse(Buffer.from(payload).toString())
  if (!isValidPayload(parsed)) {
    throw new Error(
      'Invalid lambda response: payload did not have expected structure'
    )
  }

  return parsed
}

export const invokeLambda = async <T>(
  options: InvokeLambdaOptions
): Promise<InvokeLambdaResponse<T>> => {
  const { functionName } = options

  const response = await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: InvocationType.RequestResponse,
      LogType: LogType.None,
      Payload: textEncoder.encode(
        JSON.stringify(createAPIGatewayProxyEvent(options))
      ),
    })
  )

  const payload = parsePayload(response.Payload)
  return {
    data: payload.body === undefined ? undefined : JSON.parse(payload.body),
    ok: payload.statusCode >= 200 && payload.statusCode < 300,
    status: payload.statusCode ?? 500,
  }
}
