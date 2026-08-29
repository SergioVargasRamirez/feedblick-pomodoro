// Preloaded by bun test (see bunfig.toml [test] preload) before every test file. Registers a DOM
// so React Testing Library has something to render into — `bun test` runs under Bun's own
// runtime, not a browser or jsdom, so without this `document`/`window` don't exist at all.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

// NEVER import `screen` from `@testing-library/react`/`dom` in this project. `@testing-library/
// dom`'s screen.js computes its `screen` export ONCE at module-evaluation time
// (`typeof document !== 'undefined' ? getQueriesForElement(document.body, ...) : <throws>`), and
// that evaluation can happen before this preload finishes registering `document` — reproducibly
// under `bun test`, even though a plain script confirms registration itself works instantly.
// Once frozen to the throwing branch it stays broken for the rest of the process (ESM modules are
// singletons). Use the queries `render()` returns instead (`const { getByRole } = render(...)`),
// which are computed fresh per call and have no such ordering hazard.

// Extends bun:test's `expect` with jest-dom's DOM-specific matchers (toBeInTheDocument, etc.) —
// bun:test's own `expect` is Jest-compatible but doesn't ship these by default.
import { expect, afterEach } from "bun:test";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);

// @testing-library/react's auto-cleanup detects `afterEach` as an ambient global (Jest/Vitest
// convention) — bun:test doesn't install one, so without this every test after the first in a
// file would render into a DOM still holding the previous test's tree.
import { cleanup } from "@testing-library/react";
afterEach(() => {
  cleanup();
});
