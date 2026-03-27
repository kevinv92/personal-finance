import { describe, it, expect } from "vitest";

describe("category matching logic", () => {
  const containsMatch = (value: string, matchValue: string) =>
    value.includes(matchValue);
  const exactMatch = (value: string, matchValue: string) =>
    value === matchValue;
  const startsWithMatch = (value: string, matchValue: string) =>
    value.startsWith(matchValue);

  describe("contains matching", () => {
    it("matches when value contains matchValue", () => {
      expect(containsMatch("WOOLWORTHS NZ/186 MANUKAU", "WOOLWORTHS")).toBe(
        true,
      );
    });

    it("does not match when value does not contain matchValue", () => {
      expect(containsMatch("NEW WORLD PAPAKURA", "WOOLWORTHS")).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(containsMatch("woolworths", "WOOLWORTHS")).toBe(false);
    });
  });

  describe("exact matching", () => {
    it("matches when value equals matchValue exactly", () => {
      expect(
        exactMatch("PAYMENT RECEIVED THANK YOU", "PAYMENT RECEIVED THANK YOU"),
      ).toBe(true);
    });

    it("does not match partial values", () => {
      expect(
        exactMatch(
          "PAYMENT RECEIVED THANK YOU EXTRA",
          "PAYMENT RECEIVED THANK YOU",
        ),
      ).toBe(false);
    });
  });

  describe("startsWith matching", () => {
    it("matches when value starts with matchValue", () => {
      expect(startsWithMatch("BP CONNECT TAKANINI", "BP CONNECT")).toBe(true);
    });

    it("does not match when value does not start with matchValue", () => {
      expect(startsWithMatch("CONNECT BP TAKANINI", "BP CONNECT")).toBe(false);
    });
  });

  describe("payee and memo matching", () => {
    it("matches against payee", () => {
      const payee = "FOODSTUFFS NORTH ISL";
      expect(containsMatch(payee, "FOODSTUFFS")).toBe(true);
    });

    it("matches against memo when payee does not match", () => {
      const payee = "MB TRANSFER";
      const memo = "FS SALARY";
      const matchValue = "SALARY";

      const matches =
        containsMatch(payee, matchValue) || containsMatch(memo, matchValue);
      expect(matches).toBe(true);
    });

    it("does not match when neither payee nor memo contains value", () => {
      const payee = "MB TRANSFER";
      const memo = "TO CARD 0128";
      const matchValue = "SALARY";

      const matches =
        containsMatch(payee, matchValue) || containsMatch(memo, matchValue);
      expect(matches).toBe(false);
    });
  });

  describe("multiple matchValues (any match wins)", () => {
    it("matches when any value in the array matches", () => {
      const matchValues = ["NEW WORLD", "WOOLWORTHS", "FOODIE MART"];
      const payee = "FOODIE MART AUCKLAND";

      const matches = matchValues.some((v) => containsMatch(payee, v));
      expect(matches).toBe(true);
    });

    it("does not match when no values match", () => {
      const matchValues = ["NEW WORLD", "WOOLWORTHS"];
      const payee = "BP CONNECT TAKANINI";

      const matches = matchValues.some((v) => containsMatch(payee, v));
      expect(matches).toBe(false);
    });
  });

  describe("sort order (first match wins)", () => {
    it("first matching rule by sort order wins", () => {
      const rules = [
        { categoryId: "groceries", matchValues: ["NEW WORLD"], sortOrder: 0 },
        { categoryId: "food", matchValues: ["NEW WORLD"], sortOrder: 1 },
      ];

      const payee = "NEW WORLD PAPAKURA";

      let result: string | null = null;
      for (const rule of rules) {
        if (rule.matchValues.some((v) => containsMatch(payee, v))) {
          result = rule.categoryId;
          break;
        }
      }

      expect(result).toBe("groceries");
    });
  });
});
