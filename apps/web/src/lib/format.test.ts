import { describe, it, expect } from "vitest";
import { formatAmount } from "./format";

describe("formatAmount", () => {
  it("formats positive amounts with dollar sign", () => {
    expect(formatAmount(100)).toBe("$100.00");
  });

  it("formats negative amounts with minus and dollar sign", () => {
    expect(formatAmount(-100)).toBe("-$100.00");
  });

  it("formats zero", () => {
    expect(formatAmount(0)).toBe("$0.00");
  });

  it("formats with two decimal places", () => {
    expect(formatAmount(9.9)).toBe("$9.90");
    expect(formatAmount(-0.5)).toBe("-$0.50");
  });

  it("includes commas for thousands", () => {
    expect(formatAmount(3667.37)).toBe("$3,667.37");
    expect(formatAmount(-12345.67)).toBe("-$12,345.67");
  });
});
