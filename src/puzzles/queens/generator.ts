import type { Grid } from '../../core/grid'
import type { PuzzleGenerationContext, PuzzleGenerator } from '../../core/puzzle'
import { createSeededRandom, type RandomSource } from '../../core/random'
import { hasValidConnectedRegions } from './regions'
import { countSolutions } from './solver'
import type { QueensPuzzleInstance, QueensRegionLayout } from './types'

export interface QueensGeneratorOptions {
  readonly size?: number
}

export interface GenerateQueensOptions extends QueensGeneratorOptions {
  readonly seed: string
}

const DEFAULT_SIZE = 8
const MAX_GENERATION_ATTEMPTS = 1_000

function normalizeSize(value: number | undefined): number {
  const size = value ?? DEFAULT_SIZE
  if (!Number.isInteger(size) || size < 5 || size > 10) {
    throw new RangeError('size must be an integer between 5 and 10')
  }
  return size
}

function generateSolutionColumns(size: number, random: RandomSource): number[] {
  const columns = new Array<number>(size).fill(-1)
  const used = new Uint8Array(size)

  const placeRow = (row: number): boolean => {
    if (row === size) return true
    const candidates = random.shuffle(Array.from({ length: size }, (_, col) => col))
    for (const col of candidates) {
      if (used[col] || (row > 0 && Math.abs((columns[row - 1] as number) - col) === 1)) continue
      columns[row] = col
      used[col] = 1
      if (placeRow(row + 1)) return true
      used[col] = 0
      columns[row] = -1
    }
    return false
  }

  if (!placeRow(0)) throw new Error(`Unable to generate a ${size}×${size} queen arrangement`)
  return columns
}

function orthogonalNeighbours(index: number, size: number): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const neighbours: number[] = []
  if (row > 0) neighbours.push(index - size)
  if (row + 1 < size) neighbours.push(index + size)
  if (col > 0) neighbours.push(index - 1)
  if (col + 1 < size) neighbours.push(index + 1)
  return neighbours
}

/** Grows every region from its solution queen, so connectivity is true by construction. */
function growRegions(
  solutionColumns: readonly number[],
  random: RandomSource,
): QueensRegionLayout {
  const size = solutionColumns.length
  const regionIds = new Int16Array(size * size).fill(-1)
  const frontiers = Array.from({ length: size }, () => new Set<number>())
  // A few singleton anchor regions intentionally constrain the puzzle enough to keep uniqueness
  // retries interactive. The remaining regions grow into irregular connected shapes.
  const singletonRegions = new Set(
    random.shuffle(Array.from({ length: size }, (_, regionId) => regionId)).slice(0, Math.ceil(size / 3)),
  )

  for (let regionId = 0; regionId < size; regionId += 1) {
    const anchor = regionId * size + (solutionColumns[regionId] as number)
    regionIds[anchor] = regionId
  }
  for (let regionId = 0; regionId < size; regionId += 1) {
    if (singletonRegions.has(regionId)) continue
    const anchor = regionId * size + (solutionColumns[regionId] as number)
    for (const neighbour of orthogonalNeighbours(anchor, size)) {
      if (regionIds[neighbour] === -1) frontiers[regionId]?.add(neighbour)
    }
  }

  let assigned = size
  while (assigned < size * size) {
    const expansions = frontiers.flatMap((frontier, regionId) =>
      [...frontier]
        .filter((index) => regionIds[index] === -1)
        .map((index) => ({ regionId, index })),
    )
    const { regionId, index } = random.pick(expansions) as { regionId: number; index: number }
    regionIds[index] = regionId
    assigned += 1
    for (const frontier of frontiers) frontier.delete(index)
    for (const neighbour of orthogonalNeighbours(index, size)) {
      if (regionIds[neighbour] === -1) frontiers[regionId]?.add(neighbour)
    }
  }

  return {
    rowCount: size,
    columnCount: size,
    cells: Array.from({ length: size }, (_, row) =>
      Array.from({ length: size }, (_, col) => regionIds[row * size + col] as number),
    ),
  } satisfies Grid<number>
}

function generateWithContext(
  context: PuzzleGenerationContext,
  options: QueensGeneratorOptions = {},
): QueensPuzzleInstance {
  const size = normalizeSize(options.size)

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const solutionColumns = generateSolutionColumns(size, context.random)
    const regions = growRegions(solutionColumns, context.random)
    const instance: QueensPuzzleInstance = {
      id: `queens:${context.seed}`,
      puzzleType: 'queens',
      question: { regions, regionCount: size },
      metadata: { seed: context.seed, generatorVersion: 1, size, generationAttempt: attempt },
    }
    if (hasValidConnectedRegions(regions, size) && countSolutions(instance, 2) === 1) {
      return instance
    }
  }

  throw new Error(`Unable to generate a unique Queens puzzle after ${MAX_GENERATION_ATTEMPTS} attempts`)
}

export function generateQueens(options: GenerateQueensOptions): QueensPuzzleInstance {
  return generateWithContext(
    { seed: options.seed, random: createSeededRandom(options.seed) },
    options,
  )
}

export const queensGenerator: PuzzleGenerator<QueensPuzzleInstance> = {
  generate(context, options) {
    const queensOptions =
      typeof options === 'object' && options !== null ? (options as QueensGeneratorOptions) : undefined
    return generateWithContext(context, queensOptions)
  },
}
