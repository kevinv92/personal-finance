import { describe, it, expect } from "vitest";
import {
  isMemoGeneric,
  groupingKey,
  detectFrequency,
  amountConsistency,
} from "./recurring-detection.js";

describe("isMemoGeneric", () => {
  it("treats null as generic", () => {
    expect(isMemoGeneric(null)).toBe(true);
  });

  it("treats empty string as generic", () => {
    expect(isMemoGeneric("")).toBe(true);
    expect(isMemoGeneric("  ")).toBe(true);
  });

  it("treats pure digits as generic (card numbers)", () => {
    expect(isMemoGeneric("0128")).toBe(true);
    expect(isMemoGeneric("1234")).toBe(true);
  });

  it("treats EFTPOS as generic", () => {
    expect(isMemoGeneric("EFTPOS")).toBe(true);
    expect(isMemoGeneric("eftpos")).toBe(true);
  });

  it("treats meaningful memos as non-generic", () => {
    expect(isMemoGeneric("FS SALARY")).toBe(false);
    expect(isMemoGeneric("TO CARD 0128 THANK YOU")).toBe(false);
    expect(isMemoGeneric("BILL PAYMENT TO BBall  KevinVarela")).toBe(false);
    expect(isMemoGeneric("A/P ElectricCont  Kevin V")).toBe(false);
  });
});

describe("groupingKey", () => {
  it("uses payee only when memo is generic", () => {
    expect(groupingKey("OFFSHORE SERVICE MARGINS", "0128")).toBe(
      "OFFSHORE SERVICE MARGINS",
    );
    expect(groupingKey("Some Payee", null)).toBe("SOME PAYEE");
    expect(groupingKey("PB Technologies", "EFTPOS")).toBe("PB TECHNOLOGIES");
  });

  it("combines payee and memo when memo is meaningful", () => {
    expect(groupingKey("MB TRANSFER", "TO CARD 0128 THANK YOU")).toBe(
      "MB TRANSFER|||TO CARD 0128 THANK YOU",
    );
    expect(groupingKey("Mama", "A/P ElectricCont  Kevin V")).toBe(
      "MAMA|||A/P ELECTRICCONT  KEVIN V",
    );
  });

  it("normalises whitespace and case", () => {
    expect(groupingKey("  mb transfer  ", "  to card 0128 thank you  ")).toBe(
      "MB TRANSFER|||TO CARD 0128 THANK YOU",
    );
  });
});

describe("detectFrequency", () => {
  it("returns null for fewer than 2 dates", () => {
    expect(detectFrequency([])).toBeNull();
    expect(detectFrequency(["2026-01-01"])).toBeNull();
  });

  it("detects weekly frequency", () => {
    const dates = ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"];
    const result = detectFrequency(dates);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe("weekly");
    expect(result!.confidence).toBe(1);
  });

  it("detects fortnightly frequency", () => {
    const dates = ["2026-01-01", "2026-01-15", "2026-01-29", "2026-02-12"];
    const result = detectFrequency(dates);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe("fortnightly");
    expect(result!.confidence).toBe(1);
  });

  it("detects monthly frequency", () => {
    const dates = ["2026-01-14", "2026-02-11", "2026-03-11"];
    const result = detectFrequency(dates);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe("monthly");
    expect(result!.confidence).toBe(1);
  });

  it("detects quarterly frequency", () => {
    const dates = ["2026-01-01", "2026-04-01", "2026-07-01"];
    const result = detectFrequency(dates);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe("quarterly");
  });

  it("detects annual frequency", () => {
    const dates = ["2024-06-15", "2025-06-14", "2026-06-15"];
    const result = detectFrequency(dates);
    expect(result).not.toBeNull();
    expect(result!.frequency).toBe("annual");
  });

  it("returns null for irregular intervals", () => {
    const dates = ["2026-01-01", "2026-01-03", "2026-02-20", "2026-03-01"];
    expect(detectFrequency(dates)).toBeNull();
  });
});

describe("amountConsistency", () => {
  it("reports consistent for identical amounts", () => {
    const result = amountConsistency([-60.76, -60.76, -60.76]);
    expect(result.consistent).toBe(true);
    expect(result.median).toBe(-60.76);
  });

  it("preserves negative sign for expenses", () => {
    const result = amountConsistency([-300, -300, -300]);
    expect(result.median).toBe(-300);
  });

  it("preserves positive sign for income", () => {
    const result = amountConsistency([3667.37, 3667.37, 3667.36]);
    expect(result.median).toBeGreaterThan(0);
  });

  it("reports consistent within default 10% tolerance", () => {
    // 100, 105, 95 — all within 10% of median 100
    const result = amountConsistency([-100, -105, -95]);
    expect(result.consistent).toBe(true);
  });

  it("reports inconsistent when amounts vary too much", () => {
    const result = amountConsistency([-100, -200, -500]);
    expect(result.consistent).toBe(false);
  });

  it("respects custom tolerance", () => {
    // ~20% variance: amounts 100, 120 — within 20% but not 5%
    const within20 = amountConsistency([-100, -120], 0.2);
    expect(within20.consistent).toBe(true);

    const within5 = amountConsistency([-100, -120], 0.05);
    expect(within5.consistent).toBe(false);
  });

  it("handles FX-fluctuating subscriptions", () => {
    // Claude AI sub with exchange rate variation
    const result = amountConsistency([-165.15, -158.3, -170.0], 0.1);
    expect(result.consistent).toBe(true);
    expect(result.median).toBeLessThan(0);
  });
});
