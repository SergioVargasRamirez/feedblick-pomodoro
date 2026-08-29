// Hand-rolled types for the small slice of `bun:test`'s API this project's tests actually use.
//
// Deliberately NOT `@types/bun`: that package's transitive dependency `bun-types` makes the bare
// module specifier "bun" resolvable, and `srvx` (an indirect dependency of `nitro`, reached via
// `vite.config.ts`'s `import("nitro/vite")`) has an UNCONDITIONAL `import ... from "bun"` in its
// own .d.ts for a Bun-specific adapter branch it doesn't otherwise use here. Before `@types/bun`
// existed anywhere in node_modules, that import silently failed to resolve — invisible because
// `skipLibCheck` suppresses errors inside .d.ts files — so nothing leaked. The moment `@types/bun`
// became resolvable, that same dormant import started resolving for real, and `@types/bun`'s
// GLOBAL augmentation of `fetch` (adding `.preconnect`) then applied to the WHOLE program,
// breaking `typeof fetch` in src/integrations/supabase/*.ts — files that must stay generic across
// browser/Vercel, not typed against Bun's runtime. A separate tsconfig.test.json (see its own
// comment) was not enough on its own, because both programs share one flat node_modules and
// `srvx`'s import resolves the SAME "bun" specifier regardless of which tsconfig asked for it —
// isolating the test *program* doesn't isolate the *module resolution* that pollutes it. The only
// reliable fix is keeping `bun-types` out of node_modules entirely.
//
// Extend this file if a test needs more of the real API — check against Bun's own docs, since
// nothing here is generated or verified against Bun's actual .d.ts.
declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export const it: typeof test;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;

  export interface Mock<T extends (...args: never[]) => unknown> {
    (...args: Parameters<T>): ReturnType<T>;
    mock: { calls: Parameters<T>[]; results: { type: "return" | "throw"; value: unknown }[] };
  }
  export function mock<T extends (...args: never[]) => unknown = () => void>(fn?: T): Mock<T>;
  export namespace mock {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function module(specifier: string, factory: () => any): void;
  }

  // Merged with @testing-library/jest-dom's own `declare module "bun:test" { interface Matchers
  // ... }` augmentation (see test/jest-dom-matchers.d.ts) via normal TS interface merging — this
  // base only needs the plain Jest-style matchers, jest-dom adds the DOM-specific ones.
  export interface Matchers<T = unknown> {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeCloseTo(expected: number, numDigits?: number): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toContain(expected: unknown): void;
    toMatch(expected: string | RegExp): void;
    toHaveLength(expected: number): void;
    toHaveBeenCalledWith(...args: unknown[]): void;
    toHaveBeenCalledTimes(times: number): void;
    toThrow(expected?: string | RegExp | Error): void;
    not: Matchers<T>;
  }
  export function expect<T = unknown>(actual: T): Matchers<T>;
  export namespace expect {
    function stringContaining(str: string): string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function extend(matchers: Record<string, (...args: any[]) => unknown>): void;
  }
}
