import type { SsmPathOptions } from '../../src/ssm/get-ssm-path'
import { getSsmPath } from '../../src/ssm/get-ssm-path'

const TestPath: SsmPathOptions = {
  component: 'lambdas/foo/bar',
  environmentType: 'dev',
  namespace: 'ns-foo',
  parameter: 'size',
  workload: 'test-service',
}

describe('getSsmPath', () => {
  describe('validation', () => {
    describe.each([['component'], ['namespace'], ['parameter'], ['workload']])(
      'rejects invalid: %s',
      (whichPart) => {
        it.each([
          ['starts with /', '/test'],
          ['ends with /', 'test/'],
          ['invalid characters', 'test-path!'],
          ['empty', ''],
        ])('%s', async (_scenario, value) => {
          expect(() =>
            getSsmPath({
              ...TestPath,
              [whichPart]: value,
            })
          ).toThrowError(whichPart)
        })
      }
    )

    describe('rejects illegal prefixes', () => {
      it.each([
        ['aws'],
        ['ssm'],
        ['aws-stuff'],
        ['ssm-test'],
        ['AWS'],
        ['SSM'],
      ])('rejects paths starting with illegal prefix: %s', (prefix) => {
        expect(() =>
          getSsmPath({
            ...TestPath,
            namespace: prefix,
          })
        ).toThrowError()
      })
    })

    it('component can contain multiple path segments', () => {
      expect(() => {
        getSsmPath({
          ...TestPath,
          component: 'foo/bar/baz',
        })
      }).not.toThrow()
    })
  })

  describe('returns correct path', () => {
    it('when all parts specified', () => {
      expect(
        getSsmPath({
          component: 'lambdas',
          environmentType: 'dev',
          namespace: 'ns-foo',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/ns-foo/test-service/lambdas/size')
    })

    it('when no namespace specified', () => {
      expect(
        getSsmPath({
          component: 'lambdas',
          environmentType: 'dev',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/dev/test-service/lambdas/size')
    })

    it('when no component specified', () => {
      expect(
        getSsmPath({
          environmentType: 'dev',
          namespace: 'ns-foo',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/ns-foo/test-service/size')
    })

    it('when no namespace or component specified', () => {
      expect(
        getSsmPath({
          environmentType: 'dev',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/dev/test-service/size')
    })

    it('when component has multiple parts', () => {
      expect(
        getSsmPath({
          component: 'lambdas/foo/bar',
          environmentType: 'dev',
          namespace: 'ns-foo',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/ns-foo/test-service/lambdas/foo/bar/size')
    })
  })
})

describe('getSsmPath(SsmPathOptions)', () => {
  describe('validation', () => {
    describe.each([['component'], ['namespace'], ['parameter'], ['workload']])(
      'rejects invalid: %s',
      (whichPart) => {
        it.each([
          ['starts with /', '/test'],
          ['ends with /', 'test/'],
          ['invalid characters', 'test-path!'],
          ['empty', ''],
        ])('%s', async (_scenario, value) => {
          expect(() =>
            getSsmPath({
              ...TestPath,
              [whichPart]: value,
            })
          ).toThrowError(whichPart)
        })
      }
    )

    describe('rejects illegal prefixes', () => {
      it.each([
        ['aws'],
        ['ssm'],
        ['aws-stuff'],
        ['ssm-test'],
        ['AWS'],
        ['SSM'],
      ])('rejects paths starting with illegal prefix: %s', (prefix) => {
        expect(() =>
          getSsmPath({
            ...TestPath,
            namespace: prefix,
          })
        ).toThrowError()
      })
    })

    it('component can contain multiple path segments', () => {
      expect(() => {
        getSsmPath({
          ...TestPath,
          component: 'foo/bar/baz',
        })
      }).not.toThrow()
    })
  })

  describe('returns correct path', () => {
    it('when all parts specified', () => {
      expect(
        getSsmPath({
          component: 'lambdas',
          environmentType: 'dev',
          namespace: 'ns-foo',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/ns-foo/test-service/lambdas/size')
    })

    it('when no namespace specified', () => {
      expect(
        getSsmPath({
          component: 'lambdas',
          environmentType: 'dev',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/dev/test-service/lambdas/size')
    })

    it('when no component specified', () => {
      expect(
        getSsmPath({
          environmentType: 'dev',
          namespace: 'ns-foo',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/ns-foo/test-service/size')
    })

    it('when no namespace or component specified', () => {
      expect(
        getSsmPath({
          environmentType: 'dev',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/dev/test-service/size')
    })

    it('when component has multiple parts', () => {
      expect(
        getSsmPath({
          component: 'lambdas/foo/bar',
          environmentType: 'dev',
          namespace: 'ns-foo',
          parameter: 'size',
          workload: 'test-service',
        })
      ).toEqual('/ns-foo/test-service/lambdas/foo/bar/size')
    })
  })
})
