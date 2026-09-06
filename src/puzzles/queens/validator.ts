import { getCell, isInBounds } from '../../core/grid'
import type { Position } from '../../core/grid'
import type { ValidationIssue, ValidationResult } from '../../core/puzzle'
import { hasValidConnectedRegions } from './regions'
import type {
  QueensPlacementGrid,
  QueensPlayerState,
  QueensPuzzleInstance,
  QueensSolution,
} from './types'

function countQueens(values: readonly boolean[]): number {
  return values.filter(Boolean).length
}

function hasValidPlacementShape(instance: QueensPuzzleInstance, queens: QueensPlacementGrid): boolean {
  const regions = instance.question.regions
  return (
    queens.rowCount === regions.rowCount &&
    queens.columnCount === regions.columnCount &&
    queens.cells.length === regions.rowCount &&
    queens.cells.every(
      (row) => row.length === regions.columnCount && row.every((value) => typeof value === 'boolean'),
    )
  )
}

export function rowHasMultipleQueens(queens: QueensPlacementGrid, row: number): boolean {
  return countQueens(queens.cells[row] ?? []) > 1
}

export function columnHasMultipleQueens(queens: QueensPlacementGrid, col: number): boolean {
  return countQueens(queens.cells.map((row) => row[col] === true)) > 1
}

export function regionHasMultipleQueens(
  instance: QueensPuzzleInstance,
  queens: QueensPlacementGrid,
  regionId: number,
): boolean {
  let count = 0
  for (let row = 0; row < queens.rowCount; row += 1) {
    for (let col = 0; col < queens.columnCount; col += 1) {
      if (instance.question.regions.cells[row]?.[col] === regionId && queens.cells[row]?.[col]) {
        count += 1
        if (count > 1) return true
      }
    }
  }
  return false
}

export function hasDiagonallyAdjacentQueens(queens: QueensPlacementGrid): boolean {
  for (let row = 0; row < queens.rowCount - 1; row += 1) {
    for (let col = 0; col < queens.columnCount; col += 1) {
      if (!queens.cells[row]?.[col]) continue
      if (queens.cells[row + 1]?.[col - 1] || queens.cells[row + 1]?.[col + 1]) return true
    }
  }
  return false
}

export function isLegalQueenPlacement(
  instance: QueensPuzzleInstance,
  state: QueensPlayerState,
  position: Position,
): boolean {
  const { regions, regionCount } = instance.question
  if (
    !hasValidConnectedRegions(regions, regionCount) ||
    !hasValidPlacementShape(instance, state.queens) ||
    !isInBounds(regions, position) ||
    getCell(state.queens, position) === true
  ) {
    return false
  }

  const regionId = getCell(regions, position)
  if (regionId === undefined) return false

  for (let col = 0; col < regions.columnCount; col += 1) {
    if (state.queens.cells[position.row]?.[col]) return false
  }
  for (let row = 0; row < regions.rowCount; row += 1) {
    if (state.queens.cells[row]?.[position.col]) return false
  }
  for (let row = 0; row < regions.rowCount; row += 1) {
    for (let col = 0; col < regions.columnCount; col += 1) {
      if (regions.cells[row]?.[col] === regionId && state.queens.cells[row]?.[col]) return false
    }
  }
  for (const rowDelta of [-1, 1]) {
    for (const colDelta of [-1, 1]) {
      if (getCell(state.queens, { row: position.row + rowDelta, col: position.col + colDelta })) {
        return false
      }
    }
  }
  return true
}

function collectIssues(instance: QueensPuzzleInstance, queens: QueensPlacementGrid): ValidationIssue[] {
  if (!hasValidConnectedRegions(instance.question.regions, instance.question.regionCount)) {
    return [{ code: 'invalid-regions', message: 'The region layout is invalid.' }]
  }
  if (!hasValidPlacementShape(instance, queens)) {
    return [{ code: 'invalid-board', message: 'The queen placement grid has the wrong shape.' }]
  }

  const issues: ValidationIssue[] = []
  for (let row = 0; row < queens.rowCount; row += 1) {
    if (rowHasMultipleQueens(queens, row)) {
      issues.push({ code: 'duplicate-row', message: `Row ${row + 1} has multiple queens.`, path: ['row', row] })
    }
  }
  for (let col = 0; col < queens.columnCount; col += 1) {
    if (columnHasMultipleQueens(queens, col)) {
      issues.push({ code: 'duplicate-column', message: `Column ${col + 1} has multiple queens.`, path: ['column', col] })
    }
  }
  for (let regionId = 0; regionId < instance.question.regionCount; regionId += 1) {
    if (regionHasMultipleQueens(instance, queens, regionId)) {
      issues.push({ code: 'duplicate-region', message: `Region ${regionId + 1} has multiple queens.`, path: ['region', regionId] })
    }
  }
  if (hasDiagonallyAdjacentQueens(queens)) {
    issues.push({ code: 'adjacent-diagonal', message: 'Queens may not touch diagonally.' })
  }
  return issues
}

export function validateQueens(
  instance: QueensPuzzleInstance,
  state: QueensPlayerState,
): ValidationResult {
  const issues = collectIssues(instance, state.queens)
  const queenCount = state.queens.cells.flat().filter(Boolean).length
  const requiredCount = instance.question.regions.rowCount
  const complete =
    issues.length === 0 &&
    instance.question.regions.rowCount === instance.question.regions.columnCount &&
    instance.question.regionCount === requiredCount &&
    queenCount === requiredCount
  return { valid: issues.length === 0, complete, issues }
}

export function isQueensSolved(
  instance: QueensPuzzleInstance,
  state: QueensPlayerState,
): boolean {
  return validateQueens(instance, state).complete
}

export function isValidQueensSolution(
  instance: QueensPuzzleInstance,
  solution: QueensSolution,
): boolean {
  return isQueensSolved(instance, { queens: solution.queens })
}

