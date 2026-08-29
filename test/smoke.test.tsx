import { describe, expect, test } from "bun:test";
import { render } from "@testing-library/react";

describe("test harness smoke test", () => {
  test("renders into a real DOM and jest-dom matchers work", () => {
    const { getByRole } = render(<button>Hallo</button>);
    expect(getByRole("button", { name: "Hallo" })).toBeInTheDocument();
  });
});
