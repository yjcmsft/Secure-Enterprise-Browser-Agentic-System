import { describe, expect, test } from "vitest";
import { ResponseNormalizer } from "../../../src/api/response-normalizer.js";

describe("ResponseNormalizer", () => {
  const normalizer = new ResponseNormalizer();

  test("normalizes string data", () => {
    const result = normalizer.normalize(200, "hello");
    expect(result).toEqual({ status: 200, data: { text: "hello" } });
  });

  test("normalizes array data", () => {
    const result = normalizer.normalize(200, [{ id: 1 }, { id: 2 }]);
    expect(result).toEqual({ status: 200, data: [{ id: 1 }, { id: 2 }] });
  });

  test("normalizes object data", () => {
    const result = normalizer.normalize(200, { key: "value" });
    expect(result).toEqual({ status: 200, data: { key: "value" } });
  });

  test("wraps primitive data in value wrapper", () => {
    const result = normalizer.normalize(200, 42);
    expect(result).toEqual({ status: 200, data: { value: 42 } });
  });

  test("wraps null data in value wrapper", () => {
    const result = normalizer.normalize(404, null);
    expect(result).toEqual({ status: 404, data: { value: null } });
  });

  test("wraps boolean data in value wrapper", () => {
    const result = normalizer.normalize(200, true);
    expect(result).toEqual({ status: 200, data: { value: true } });
  });
});
