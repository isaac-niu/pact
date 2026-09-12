import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:pact-test-evidence"),
  });
  vi.spyOn(Math, "random").mockReturnValue(0.2);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete URL.createObjectURL;
});
