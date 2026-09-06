import { createFilledGrid, setCell } from '../../core/grid'
import { hasValidConnectedRegions } from './regions'
import type { QueensPuzzleInstance, QueensSolution } from './types'

interface SearchResult {
  readonly count: number
  readonly firstSolution: QueensSolution | null
}

function search(instance: QueensPuzzleInstance, limit: number): SearchResult {
  const { regions, regionCount } = instance.question
  const size = regions.rowCount
  if (
    limit <= 0 ||
    size !== regions.columnCount ||
    regionCount !== size ||
    !hasValidConnectedRegions(regions, regionCount)
  ) {
    return { count: 0, firstSolution: null }
  }

  const columnsByRow = new Int16Array(size).fill(-1)
  const usedColumns = new Uint8Array(size)
  const usedRegions = new Uint8Array(regionCount)
  let count = 0
  let firstColumns: Int16Array | null = null

  const candidatesForRow = (row: number): number[] => {
    const candidates: number[] = []
    for (let col = 0; col < size; col += 1) {
      const regionId = regions.cells[row]?.[col]
      if (regionId === undefined || usedColumns[col] || usedRegions[regionId]) continue
      const above = columnsByRow[row - 1]
      const below = columnsByRow[row + 1]
      if ((above !== undefined && above >= 0 && Math.abs(above - col) === 1) ||
          (below !== undefined && below >= 0 && Math.abs(below - col) === 1)) {
        continue
      }
      candidates.push(col)
    }
    return candidates
  }

  const visit = (): void => {
    if (count >= limit) return

    let selectedRow = -1
    let selectedCandidates: number[] = []
    for (let row = 0; row < size; row += 1) {
      if (columnsByRow[row] !== -1) continue
      const candidates = candidatesForRow(row)
      if (candidates.length === 0) return
      if (selectedRow === -1 || candidates.length < selectedCandidates.length) {
        selectedRow = row
        selectedCandidates = candidates
        if (candidates.length === 1) break
      }
    }

    if (selectedRow === -1) {
      count += 1
      if (firstColumns === null) firstColumns = columnsByRow.slice()
      return
    }

    for (const col of selectedCandidates) {
      const regionId = regions.cells[selectedRow]?.[col]
      if (regionId === undefined) continue
      columnsByRow[selectedRow] = col
      usedColumns[col] = 1
      usedRegions[regionId] = 1
      visit()
      columnsByRow[selectedRow] = -1
      usedColumns[col] = 0
      usedRegions[regionId] = 0
      if (count >= limit) return
    }
  }

  visit()

  let firstSolution: QueensSolution | null = null
  if (firstColumns !== null) {
    let queens = createFilledGrid(size, size, false)
    const solutionColumns = firstColumns as Int16Array
    for (let row = 0; row < size; row += 1) {
      queens = setCell(queens, { row, col: solutionColumns[row] as number }, true)
    }
    firstSolution = { queens }
  }
  return { count, firstSolution }
}

export function solve(instance: QueensPuzzleInstance): QueensSolution | null {
  return search(instance, 1).firstSolution
}

export function countSolutions(
  instance: QueensPuzzleInstance,
  limit = Number.POSITIVE_INFINITY,
): number {
  if (Number.isNaN(limit) || limit <= 0) return 0
  return search(instance, Math.floor(limit)).count
}

