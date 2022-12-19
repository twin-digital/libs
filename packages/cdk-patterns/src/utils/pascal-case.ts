import { flow, camelCase, upperFirst } from 'lodash/fp'

export const pascalCase = flow(camelCase, upperFirst)
