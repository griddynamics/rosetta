declare module 'json-cycle' {
  export function decycle<T>(object: T): unknown;
  export function retrocycle<T>(object: T): T;
  export function stringify(object: unknown): string;
  export function parse<T = unknown>(text: string): T;

  const jsonCycle: {
    decycle: typeof decycle;
    retrocycle: typeof retrocycle;
    stringify: typeof stringify;
    parse: typeof parse;
  };

  export default jsonCycle;
}
