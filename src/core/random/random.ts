export interface RandomSource {
  /** Returns a value in the half-open interval [0, 1). */
  nextFloat(): number
  /** Returns an integer in the half-open interval [min, max). */
  nextInt(min: number, max: number): number
  nextBoolean(probability?: number): boolean
  pick<T>(items: readonly T[]): T | undefined
  /** Returns a shuffled copy and never changes the input array. */
  shuffle<T>(items: readonly T[]): T[]
}

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  hash = Math.imul(hash ^ (hash >>> 16), 2246822507)
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909)
  return (hash ^= hash >>> 16) >>> 0
}

function assertInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer`)
  }
}

export function createSeededRandom(seed: string): RandomSource {
  let state = hashSeed(seed)

  const nextFloat = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  return {
    nextFloat,

    nextInt(min: number, max: number): number {
      assertInteger(min, 'min')
      assertInteger(max, 'max')
      if (max <= min) {
        throw new RangeError('max must be greater than min')
      }

      return min + Math.floor(nextFloat() * (max - min))
    },

    nextBoolean(probability = 0.5): boolean {
      if (probability < 0 || probability > 1 || !Number.isFinite(probability)) {
        throw new RangeError('probability must be between 0 and 1')
      }

      return nextFloat() < probability
    },

    pick<T>(items: readonly T[]): T | undefined {
      return items.length === 0 ? undefined : items[this.nextInt(0, items.length)]
    },

    shuffle<T>(items: readonly T[]): T[] {
      const shuffled = [...items]
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = this.nextInt(0, index + 1)
        ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex] as T, shuffled[index] as T]
      }
      return shuffled
    },
  }
}
