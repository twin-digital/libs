import { Construct } from 'constructs'

export type ConstructConstructor<
  T extends Construct = Construct,
  P extends object | undefined = undefined
> = [P] extends [undefined]
  ? new (scope: Construct, id: string, ...rest: any[]) => T
  : new (scope: Construct, id: string, props: P, ...rest: any[]) => T

/** A short name is a kebab-cased human readable string, suitable for use as an identifier or other short value. */
export type ShortName = string
