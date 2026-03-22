declare module "bun:test" {
  export function describe(name: string, callback: () => void): void;
  export const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toContain: (expected: string) => void;
    toEqual: (expected: unknown) => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
  };
  export function test(
    name: string,
    callback: () => void | Promise<void>
  ): void;
}
