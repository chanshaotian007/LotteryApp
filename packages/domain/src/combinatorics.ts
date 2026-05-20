export function combination(n: number, r: number): number {
  if (r < 0 || n < 0 || r > n) {
    return 0;
  }
  const selected = Math.min(r, n - r);
  let result = 1;
  for (let index = 1; index <= selected; index += 1) {
    result = Math.floor((result * (n - selected + index)) / index);
  }
  return result;
}

export function calculateBets(
  primaryCount: number,
  secondaryCount: number,
  primaryPick: number,
  secondaryPick: number,
): number {
  return combination(primaryCount, primaryPick) * combination(secondaryCount, secondaryPick);
}
