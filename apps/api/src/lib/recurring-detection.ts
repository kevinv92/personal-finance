/** Memos that carry no grouping signal (card numbers, empty, generic labels) */
export function isMemoGeneric(memo: string | null): boolean {
  if (!memo || memo.trim() === "") return true;
  if (/^\d+$/.test(memo.trim())) return true;
  if (memo.trim().toUpperCase() === "EFTPOS") return true;
  return false;
}

/** Build a grouping key from payee+memo */
export function groupingKey(payee: string, memo: string | null): string {
  const normPayee = payee.trim().toUpperCase();
  if (isMemoGeneric(memo)) return normPayee;
  return `${normPayee}|||${memo!.trim().toUpperCase()}`;
}

export type Frequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "annual";

export interface FrequencyMatch {
  frequency: Frequency;
  confidence: number;
}

const FREQUENCY_DAYS: [Frequency, number, number][] = [
  ["weekly", 7, 2],
  ["fortnightly", 14, 3],
  ["monthly", 30, 5],
  ["quarterly", 91, 15],
  ["annual", 365, 30],
];

/** Given sorted dates, detect the most likely frequency */
export function detectFrequency(dates: string[]): FrequencyMatch | null {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort();
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1]!).getTime();
    const b = new Date(sorted[i]!).getTime();
    intervals.push(Math.round((b - a) / (1000 * 60 * 60 * 24)));
  }

  const median =
    intervals.length % 2 === 0
      ? (intervals.sort((a, b) => a - b)[intervals.length / 2 - 1]! +
          intervals.sort((a, b) => a - b)[intervals.length / 2]!) /
        2
      : intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)]!;

  for (const [freq, target, tolerance] of FREQUENCY_DAYS) {
    if (Math.abs(median - target) <= tolerance) {
      const matchingIntervals = intervals.filter(
        (d) => Math.abs(d - target) <= tolerance,
      ).length;
      const confidence = matchingIntervals / intervals.length;
      if (confidence >= 0.5) {
        return { frequency: freq, confidence };
      }
    }
  }
  return null;
}

/** Check whether amounts are consistent (within tolerance % of median) */
export function amountConsistency(
  amounts: number[],
  tolerancePct = 0.1,
): { consistent: boolean; median: number } {
  const absSorted = amounts.map(Math.abs).sort((a, b) => a - b);
  const absMedian =
    absSorted.length % 2 === 0
      ? (absSorted[absSorted.length / 2 - 1]! +
          absSorted[absSorted.length / 2]!) /
        2
      : absSorted[Math.floor(absSorted.length / 2)]!;

  const withinTolerance = absSorted.filter(
    (a) => Math.abs(a - absMedian) <= absMedian * tolerancePct,
  ).length;

  // Preserve sign from majority of amounts
  const negCount = amounts.filter((a) => a < 0).length;
  const sign = negCount >= amounts.length / 2 ? -1 : 1;

  return {
    consistent: withinTolerance / amounts.length >= 0.5,
    median: sign * absMedian,
  };
}
