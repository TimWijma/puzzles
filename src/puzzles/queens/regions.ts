import type { Position } from '../../core/grid'
import type { QueensRegionLayout } from './types'

export function cellsInRegion(
  regions: QueensRegionLayout,
  regionId: number,
): Position[] {
  const cells: Position[] = []
  for (let row = 0; row < regions.rowCount; row += 1) {
    for (let col = 0; col < regions.columnCount; col += 1) {
      if (regions.cells[row]?.[col] === regionId) cells.push({ row, col })
    }
  }
  return cells
}

export function hasValidRegionIds(
  regions: QueensRegionLayout,
  regionCount: number,
): boolean {
  if (
    !Number.isInteger(regionCount) ||
    regionCount <= 0 ||
    regions.rowCount <= 0 ||
    regions.columnCount <= 0 ||
    regions.cells.length !== regions.rowCount ||
    regions.cells.some((row) => row.length !== regions.columnCount)
  ) {
    return false
  }

  const seen = new Set<number>()
  for (const row of regions.cells) {
    for (const regionId of row) {
      if (!Number.isInteger(regionId) || regionId < 0 || regionId >= regionCount) return false
      seen.add(regionId)
    }
  }
  return seen.size === regionCount
}

export function isRegionConnected(regions: QueensRegionLayout, regionId: number): boolean {
  const cells = cellsInRegion(regions, regionId)
  const first = cells[0]
  if (first === undefined) return false

  const expected = new Set(cells.map(({ row, col }) => `${row}:${col}`))
  const visited = new Set<string>()
  const pending: Position[] = [first]

  while (pending.length > 0) {
    const cell = pending.pop() as Position
    const key = `${cell.row}:${cell.col}`
    if (visited.has(key)) continue
    visited.add(key)

    const neighbours: Position[] = [
      { row: cell.row - 1, col: cell.col },
      { row: cell.row + 1, col: cell.col },
      { row: cell.row, col: cell.col - 1 },
      { row: cell.row, col: cell.col + 1 },
    ]
    for (const neighbour of neighbours) {
      const neighbourKey = `${neighbour.row}:${neighbour.col}`
      if (expected.has(neighbourKey) && !visited.has(neighbourKey)) pending.push(neighbour)
    }
  }

  return visited.size === cells.length
}

export function hasValidConnectedRegions(
  regions: QueensRegionLayout,
  regionCount: number,
): boolean {
  if (!hasValidRegionIds(regions, regionCount)) return false
  return Array.from({ length: regionCount }, (_, regionId) => regionId).every((regionId) =>
    isRegionConnected(regions, regionId),
  )
}

