import { isObject } from 'lodash'
import { identity, isNaN, isString, mapValues } from 'lodash/fp'
import mustache from 'mustache'

import { sqsToSfnHandler } from '../lambda/sqs-to-sfn-handler'

export type SimpleValue = boolean | number | string
export type Value = SimpleValue | EventMappingDefinition

// must be interface & not type due to recursion
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EventMappingDefinition extends Record<string, Value> {}

export const createTemplate = (definition: EventMappingDefinition): string =>
  JSON.stringify(definition)

/**
 * Return a boolean representation of the given string, or undefined if the string is not
 * equal to 'true' or 'false'.
 */
const asBoolean = (value: string) => {
  if (value === 'true') {
    return true
  } else if (value === 'false') {
    return false
  }

  return undefined
}

/**
 * Return a numeric representation of the given string, or undefined if the string is not
 * a valid number.
 */
const asNumber = (value: string) => {
  const asNumber = Number(value)
  if (!isNaN(asNumber)) {
    return asNumber
  }

  return undefined
}

/**
 * Converts a string type into a number or boolean, if able. Otherwise, returns the string
 * unaltered.
 */
const coerceType = (value: string) => {
  return asBoolean(value) ?? asNumber(value) ?? value
}

const getMappedValue = (
  mapping: string,
  source: Record<string, unknown>
): SimpleValue => {
  const result = mustache.render(
    mapping,
    source,
    {},
    {
      // disable html escaping
      escape: identity,
    }
  )

  return coerceType(result)
}

/**
 * Maps the SQS message to a step function input object using the template set in the
 * 'INPUT_MAPPING' env variable, if any.
 */
export const mapEventToInput = (
  message: Record<string, unknown>,
  template?: string
) => {
  const templateOrDefault = template ?? process.env.INPUT_MAPPING

  if (templateOrDefault) {
    const mapping = JSON.parse(templateOrDefault)

    const mapValue = (value: EventMappingDefinition): Value => {
      if (isObject(value)) {
        // value is an object, recursively map it
        return mapValues(mapValue, value)
      } else if (isString(value)) {
        // value is a string, parse it as a mapping template
        return getMappedValue(value, message)
      } else {
        // value isn't a string, pass it through to result as static value
        return value
      }
    }

    return mapValues(mapValue, mapping)
  } else {
    return message
  }
}

export const handler = sqsToSfnHandler({
  getInput: mapEventToInput,
  stepFunctionArn: process.env.STEP_FUNCTION_ARN ?? '',
})
