// Period helpers — quarterly cadence by default.
export function currentPeriod(date = new Date()): string {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${y}-Q${q}`;
}

export function comparePeriods(a: string, b: string): number {
  return a.localeCompare(b);
}
