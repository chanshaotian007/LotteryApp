export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, maxInclusive: number): number {
    return Math.floor(this.next() * (maxInclusive - min + 1)) + min;
  }

  choice<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)];
  }

  sample<T>(values: readonly T[], count: number): T[] {
    const pool = [...values];
    const result: T[] = [];
    for (let index = 0; index < count; index += 1) {
      const selected = this.int(0, pool.length - 1);
      result.push(pool[selected]);
      pool.splice(selected, 1);
    }
    return result;
  }
}

export interface RandomLike {
  next(): number;
  int(min: number, maxInclusive: number): number;
  choice<T>(values: readonly T[]): T;
  sample<T>(values: readonly T[], count: number): T[];
}

export function createRandom(seed?: number | null): RandomLike {
  if (seed !== undefined && seed !== null) {
    return new SeededRandom(seed);
  }
  return {
    next: () => Math.random(),
    int: (min, maxInclusive) => Math.floor(Math.random() * (maxInclusive - min + 1)) + min,
    choice: <T>(values: readonly T[]) => values[Math.floor(Math.random() * values.length)],
    sample: <T>(values: readonly T[], count: number) => {
      const pool = [...values];
      const result: T[] = [];
      for (let index = 0; index < count; index += 1) {
        const selected = Math.floor(Math.random() * pool.length);
        result.push(pool[selected]);
        pool.splice(selected, 1);
      }
      return result;
    },
  };
}
