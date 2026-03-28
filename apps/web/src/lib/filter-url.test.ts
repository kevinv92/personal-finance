import { describe, it, expect } from "vitest";
import {
  encodeFilters,
  decodeFilters,
  buildTransactionsUrl,
} from "./filter-url";
import type { FilterCondition } from "./api";

describe("encodeFilters", () => {
  it("returns null for empty conditions", () => {
    expect(encodeFilters([])).toBeNull();
  });

  it("encodes conditions as base64 JSON", () => {
    const conditions: FilterCondition[] = [
      { field: "payee", operator: "contains", value: ["WOOLWORTHS"] },
    ];
    const encoded = encodeFilters(conditions);
    expect(encoded).not.toBeNull();
    expect(JSON.parse(atob(encoded!))).toEqual(conditions);
  });
});

describe("decodeFilters", () => {
  it("returns empty array for null", () => {
    expect(decodeFilters(null)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(decodeFilters("")).toEqual([]);
  });

  it("returns empty array for invalid base64", () => {
    expect(decodeFilters("not-valid-base64!!!")).toEqual([]);
  });

  it("returns empty array for valid base64 but non-array JSON", () => {
    expect(decodeFilters(btoa('{"not": "array"}'))).toEqual([]);
  });

  it("round-trips with encodeFilters", () => {
    const conditions: FilterCondition[] = [
      { field: "payee", operator: "contains", value: ["MB TRANSFER"] },
      { field: "memo", operator: "contains", value: ["TO CARD 0128"] },
    ];
    const encoded = encodeFilters(conditions)!;
    const decoded = decodeFilters(encoded);
    expect(decoded).toEqual(conditions);
  });
});

describe("buildTransactionsUrl", () => {
  it("returns bare path for empty conditions", () => {
    expect(buildTransactionsUrl([])).toBe("/transactions");
  });

  it("builds URL with encoded filters param", () => {
    const conditions: FilterCondition[] = [
      { field: "payee", operator: "contains", value: ["SALARY"] },
    ];
    const url = buildTransactionsUrl(conditions);
    expect(url).toMatch(/^\/transactions\?filters=/);

    // Verify the param decodes back
    const param = url.split("?filters=")[1]!;
    expect(decodeFilters(param)).toEqual(conditions);
  });

  it("handles payee+memo combo for recurring items", () => {
    const conditions: FilterCondition[] = [
      { field: "payee", operator: "contains", value: ["MB TRANSFER"] },
      {
        field: "memo",
        operator: "contains",
        value: ["TO 12-3629- 0297757-50"],
      },
    ];
    const url = buildTransactionsUrl(conditions);
    const param = url.split("?filters=")[1]!;
    const decoded = decodeFilters(param);
    expect(decoded).toHaveLength(2);
    expect(decoded[0]!.field).toBe("payee");
    expect(decoded[1]!.field).toBe("memo");
  });
});
