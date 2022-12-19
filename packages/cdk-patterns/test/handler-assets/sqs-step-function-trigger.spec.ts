import { get } from 'lodash/fp'
import {
  createTemplate,
  mapEventToInput,
} from '../../src/handler-assets/sqs-step-function-trigger'

const testMessage = {
  value1: 'one',
  value2: true,
  value3: {
    isDeep: 5,
    why: 'better testing',
  },
  html: '<a href=foo>bleh</a> &amp;',
  jsonUnsafeValue: '"this value \\will\\ cause problems"',
}

const OriginalEnvironment = process.env

describe('event to input mapping', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OriginalEnvironment }
  })

  afterAll(() => {
    process.env = OriginalEnvironment
  })

  it('returns the unaltered message when there is no template', () => {
    expect(mapEventToInput(testMessage)).toBe(testMessage)
  })

  it('creates empty input if template is empty', () => {
    const template = createTemplate({})
    expect(mapEventToInput(testMessage, template)).toEqual({})
  })

  it('does not escape html', () => {
    const template = createTemplate({
      output: '{{ html }}',
    })

    expect(mapEventToInput(testMessage, template)).toEqual({
      output: testMessage.html,
    })
  })

  it('escapes JSON strings', () => {
    const template = createTemplate({
      output: '{{ jsonUnsafeValue }}',
    })

    expect(mapEventToInput(testMessage, template)).toEqual({
      output: testMessage.jsonUnsafeValue,
    })
  })

  it('works when given the example from the tsdoc', () => {
    const template = createTemplate({
      type: 'mapped',
      value1: {
        original: '{{ value1 }}',
      },
      others: {
        second: '{{ value2 }}',
        third: '{{ value3.isDeep }}',
      },
      all: '{{ value1 }}, {{ value2 }}, {{ value3.isDeep }}',
    })

    expect(mapEventToInput(testMessage, template)).toEqual({
      type: 'mapped',
      value1: {
        original: 'one',
      },
      others: {
        second: true,
        third: 5,
      },
      all: 'one, true, 5',
    })
  })

  it.todo('can coerce types to string (NOT CURRENTLY IMPLEMENTED)')

  describe('static values', () => {
    it('are rendered in flat templates', () => {
      const template = createTemplate({
        greeting: 'hello',
        name: 'world',
      })

      expect(mapEventToInput(testMessage, template)).toEqual({
        greeting: 'hello',
        name: 'world',
      })
    })

    it('are rendered in nested templates', () => {
      const template = createTemplate({
        static1: 'hello',
        static2: {
          child: {
            value: 'world',
          },
        },
      })

      expect(mapEventToInput(testMessage, template)).toEqual({
        static1: 'hello',
        static2: {
          child: {
            value: 'world',
          },
        },
      })
    })

    describe('are rendered in correct data type', () => {
      it.each([
        ['strings', 'value'],
        ['booleans', true],
        ['integer', 5],
        ['numbers', 12.34],
      ])('%s', (_type, value) => {
        const template = createTemplate({
          output: value,
        })

        expect(mapEventToInput(testMessage, template)).toEqual({
          output: value,
        })
      })
    })
  })

  describe('flat templates', () => {
    it('map correctly', () => {
      const template = createTemplate({
        first: '{{ value1 }}',
        third: '{{ value3.why }}',
      })

      expect(mapEventToInput(testMessage, template)).toEqual({
        first: 'one',
        third: 'better testing',
      })
    })

    describe('correctly handle data types', () => {
      it.each([
        ['strings', 'value1'],
        ['booleans', 'value2'],
        ['numbers', 'value3.isDeep'],
      ])('%s', (_type, key) => {
        const template = createTemplate({
          output: `{{ ${key} }}`,
        })

        expect(mapEventToInput(testMessage, template)).toEqual({
          output: get(key, testMessage),
        })
      })
    })
  })

  describe('can mix static and dynamic values', () => {
    it.each([
      ['prefix-{{ value1 }}', 'prefix-one'],
      ['p-{{ value1 }}-{{ value2 }}-s', 'p-one-true-s'],
    ])('mapping: %s', (mapping, expectedValue) => {
      const template = createTemplate({
        output: mapping,
      })

      expect(mapEventToInput(testMessage, template)).toEqual({
        output: expectedValue,
      })
    })
  })

  describe('nested templates', () => {
    it('map correctly', () => {
      const template = createTemplate({
        value1: {
          original: '{{ value1 }}',
        },
        third: {
          reason: {
            value: '{{ value3.why }}',
          },
        },
      })

      expect(mapEventToInput(testMessage, template)).toEqual({
        value1: {
          original: 'one',
        },
        third: {
          reason: {
            value: 'better testing',
          },
        },
      })
    })

    describe('correctly handle data types', () => {
      it.each([
        ['strings', 'value1'],
        ['booleans', 'value2'],
        ['numbers', 'value3.isDeep'],
      ])('%s', (_type, key) => {
        const template = createTemplate({
          output: {
            nested: {
              value: `{{ ${key} }}`,
            },
          },
        })

        expect(mapEventToInput(testMessage, template)).toEqual({
          output: {
            nested: {
              value: get(key, testMessage),
            },
          },
        })
      })
    })
  })
})
