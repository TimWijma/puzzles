import {
  getOrthogonalNeighbours,
  getSurroundingNeighbours,
  type Position,
} from '../../core/grid'
import type { SuguruRegionLayout } from './types'

export function cellsInRegion(regions: SuguruRegionLayout, regionId: number): Position[] {
  const result: Position[] = []
  for (let row = 0; row < regions.rowCount; row += 1) {
    for (let col = 0; col < regions.columnCount; col += 1) {
      if (regions.cells[row]?.[col] === regionId) result.push({ row, col })
    }
  }
  return result
}

export function regionSize(regions: SuguruRegionLayout, regionId: number): number {
  return cellsInRegion(regions, regionId).length
}

export function validValuesForRegion(
  regions: SuguruRegionLayout,
  regionId: number,
): number[] {
  return Array.from({ length: regionSize(regions, regionId) }, (_, index) => index + 1)
}

export function hasValidRegionAssignments(
  regions: SuguruRegionLayout,
  regionCount: number,
): boolean {
  if (
    !Number.isInteger(regionCount) ||
    regionCount <= 0 ||
    !Number.isInteger(regions.rowCount) ||
    !Number.isInteger(regions.columnCount) ||
    regions.rowCount <= 0 ||
    regions.columnCount <= 0 ||
    regions.cells.length !== regions.rowCount ||
    regions.cells.some((row) => row.length !== regions.columnCount)
  ) return false

  const seen = new Set<number>()
  for (const row of regions.cells) {
    for (const id of row) {
      if (!Number.isInteger(id) || id < 0 || id >= regionCount) return false
      seen.add(id)
    }
  }
  return seen.size === regionCount
}

export function isRegionConnected(regions: SuguruRegionLayout, regionId: number): boolean {
  const regionCells = cellsInRegion(regions, regionId)
  const first = regionCells[0]
  if (first === undefined) return false
  const expected = new Set(regionCells.map(({ row, col }) => `${row}:${col}`))
  const visited = new Set<string>()
  const pending: Position[] = [first]

  while (pending.length > 0) {
    const position = pending.pop() as Position
    const key = `${position.row}:${position.col}`
    if (visited.has(key)) continue
    visited.add(key)
    for (const neighbour of getOrthogonalNeighbours(regions, position)) {
      const neighbourKey = `${neighbour.row}:${neighbour.col}`
      if (expected.has(neighbourKey) && !visited.has(neighbourKey)) pending.push(neighbour)
    }
  }
  return visited.size === regionCells.length
}

export function hasValidConnectedRegions(
  regions: SuguruRegionLayout,
  regionCount: number,
): boolean {
  if (!hasValidRegionAssignments(regions, regionCount)) return false
  return Array.from({ length: regionCount }, (_, id) => id).every((id) =>
    isRegionConnected(regions, id),
  )
}

export function surroundingCells(
  regions: SuguruRegionLayout,
  position: Position,
): Position[] {
  return getSurroundingNeighbours(regions, position)
}
