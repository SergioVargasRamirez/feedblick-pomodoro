// Type-only augmentation so `expect(...).toBeInTheDocument()` etc. type-check under bun:test.
// Mirrors @testing-library/jest-dom's own (unpublished-as-a-subpath) types/bun.d.ts — that file
// isn't reachable via the package's public "exports" map, so it's inlined here rather than
// imported. Runtime matcher registration is separate (see test/setup.ts's `expect.extend`).
import { type expect } from "bun:test";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

declare module "bun:test" {
  // Must stay `interface`, not `type` — TS module augmentation only merges by declaration
  // merging, which requires matching bun:test's own `interface Matchers<T>` by name.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<T = unknown> extends TestingLibraryMatchers<
    ReturnType<typeof expect.stringContaining>,
    T
  > {}
}

export {};
