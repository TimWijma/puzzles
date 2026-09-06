import type { Grid } from '../../core/grid'
import type { RandomSource } from '../../core/random'
import { cellsInRegion, surroundingCells } from './regions'
import { isValidPartialBoard } from './validator'
import type {
  SuguruPuzzleInstance,
  SuguruRegionLayout,
  SuguruSolution,
} from './types'

interface SearchResult {
  readonly count: number
  readonly firstSolution: SuguruSolution | null
}

function search(
  instance: SuguruPuzzleInstance,
  limit: number,
  random?: RandomSource,
): SearchResult {
  const { regions, regionCount, givens } = instance.question
  if (limit <= 0 || !isValidPartialBoard(instance, givens)) {
    return { count: 0, firstSolution: null }
  }

  const cellCount = regions.rowCount * regions.columnCount
  const values = new Int16Array(cellCount)
  const regionByIndex = new Int16Array(cellCount)
  const regionSizes = Array.from({ length: regionCount }, (_, id) =>
    cellsInRegion(regions, id).length,
  )
  const usedByRegion = regionSizes.map(() => new Set<number>())
  const neighboursByIndex = Array.from({ length: cellCount }, (_, index) => {
    const row = Math.floor(index / regions.columnCount)
    const col = index % regions.columnCount
    return surroundingCells(regions, { row, col }).map(
      (position) => position.row * regions.columnCount + position.col,
    )
  })

  for (let row = 0; row < regions.rowCount; row += 1) {
    for (let col = 0; col < regions.columnCount; col += 1) {
      const index = row * regions.columnCount + col
      const regionId = regions.cells[row]?.[col] as number
      const value = givens.cells[row]?.[col] ?? null
      regionByIndex[index] = regionId
      if (value !== null) {
        values[index] = value
        usedByRegion[regionId]?.add(value)
      }
    }
  }

  const candidatesFor = (index: number): number[] => {
    const regionId = regionByIndex[index] as number
    const touching = new Set<number>()
    for (const neighbour of neighboursByIndex[index] ?? []) {
      const value = values[neighbour]
      if (value !== 0 && value !== undefined) touching.add(value)
    }
    const candidates: number[] = []
    for (let value = 1; value <= (regionSizes[regionId] ?? 0); value += 1) {
      if (!usedByRegion[regionId]?.has(value) && !touching.has(value)) candidates.push(value)
    }
    return candidates
  }

  let count = 0
  let firstValues: Int16Array | null = null

  const visit = (): void => {
    if (count >= limit) return
    let bestIndex = -1
    let bestCandidates: number[] = []

    for (let index = 0; index < cellCount; index += 1) {
      if (values[index] !== 0) continue
      const candidates = candidatesFor(index)
      if (candidates.length === 0) return
      if (bestIndex === -1 || candidates.length < bestCandidates.length) {
        bestIndex = index
        bestCandidates = candidates
        if (candidates.length === 1) break
      }
    }

    if (bestIndex === -1) {
      count += 1
      if (firstValues === null) firstValues = values.slice()
      return
    }

    const regionId = regionByIndex[bestIndex] as number
    const orderedCandidates = random === undefined
      ? bestCandidates
      : random.shuffle(bestCandidates)
    for (const value of orderedCandidates) {
      values[bestIndex] = value
      usedByRegion[regionId]?.add(value)
      visit()
      usedByRegion[regionId]?.delete(value)
      values[bestIndex] = 0
      if (count >= limit) return
    }
  }

  visit()

  if (firstValues === null) return { count, firstSolution: null }
  const solved = firstValues as Int16Array
  const cells = Array.from({ length: regions.rowCount }, (_, row) =>
    Array.from(
      { length: regions.columnCount },
      (_, col) => solved[row * regions.columnCount + col] as number,
    ),
  )
  return {
    count,
    firstSolution: {
      rowCount: regions.rowCount,
      columnCount: regions.columnCount,
      cells,
    } satisfies Grid<number>,
  }
}

export function solve(instance: SuguruPuzzleInstance): SuguruSolution | null {
  return search(instance, 1).firstSolution
}

export function countSolutions(
  instance: SuguruPuzzleInstance,
  limit = Number.POSITIVE_INFINITY,
): number {
  if (Number.isNaN(limit) || limit <= 0) return 0
  return search(instance, Math.floor(limit)).count
}

/** Used only by generation to vary otherwise deterministic candidate ordering. */
export function generateSolutionForRegions(
  regions: SuguruRegionLayout,
  regionCount: number,
  random: RandomSource,
): SuguruSolution | null {
  const givens = {
    rowCount: regions.rowCount,
    columnCount: regions.columnCount,
    cells: Array.from({ length: regions.rowCount }, () =>
      Array.from({ length: regions.columnCount }, () => null),
    ),
  }
  const instance: SuguruPuzzleInstance = {
    id: 'suguru:generation',
    puzzleType: 'suguru',
    question: { regions, regionCount, givens },
    metadata: {
      seed: 'generation',
      generatorVersion: 1,
      generationAttempt: 0,
      clueCount: 0,
    },
  }
  return search(instance, 1, random).firstSolution
}
