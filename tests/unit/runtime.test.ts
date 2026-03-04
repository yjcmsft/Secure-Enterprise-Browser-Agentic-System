import { describe, expect, test } from "vitest";
import { runtime } from "../../src/runtime.js";

describe("runtime", () => {
  test("has securityGate", () => {
    expect(runtime.securityGate).toBeDefined();
  });

  test("has browserPool", () => {
    expect(runtime.browserPool).toBeDefined();
  });

  test("has domParser", () => {
    expect(runtime.domParser).toBeDefined();
  });

  test("has elementSelector", () => {
    expect(runtime.elementSelector).toBeDefined();
  });

  test("has dualPathRouter", () => {
    expect(runtime.dualPathRouter).toBeDefined();
  });

  test("has restConnector", () => {
    expect(runtime.restConnector).toBeDefined();
  });

  test("has graphqlConnector", () => {
    expect(runtime.graphqlConnector).toBeDefined();
  });

  test("has responseNormalizer", () => {
    expect(runtime.responseNormalizer).toBeDefined();
  });
});
