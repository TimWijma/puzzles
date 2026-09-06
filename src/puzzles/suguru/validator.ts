import { getCell, isInBounds, setCell, type Position } from '../../core/grid'
import type { ValidationIssue, ValidationResult } from '../../core/puzzle'
import {
  cellsInRegion,
  hasValidConnectedRegions,
  regionSize,
  surroundingCells,
} from './regions'
import { mergeSuguruBoard } from './state'
import type {
  SuguruBoard,
  SuguruMove,
  SuguruPlayerState,
  SuguruPuzzleInstance,
  SuguruSolution,
} from './types'

function hasMatchingBoardShape(instance: SuguruPuzzleInstance, board: SuguruBoard): boolean {
  const regions = instance.question.regions
  return (
    board.rowCount === regions.rowCount &&
    board.columnCount === regions.columnCount &&
    board.cells.length === regions.rowCount &&
    board.cells.every((row) => row.length === regions.columnCount)
  )
}

export function regionHasDuplicateValues(
  instance: SuguruPuzzleInstance,
  board: SuguruBoard,
  regionId: number,
): boolean {
  const seen = new Set<number>()
  for (const position of cellsInRegion(instance.question.regions, regionId)) {
    const value = getCell(board, position)
    if (value === null || value === undefined) continue
    if (seen.has(value)) return true
    seen.add(value)
  }
  return false
}

export function hasEqualTouchingValues(
  instance: SuguruPuzzleInstance,
  board: SuguruBoard,
): boolean {
  for (let row = 0; row < board.rowCount; row += 1) {
    for (let col = 0; col < board.columnCount; col += 1) {
      const value = board.cells[row]?.[col]
      if (value === null || value === undefined) continue
      if (
        surroundingCells(instance.question.regions, { row, col }).some(
          (neighbour) => getCell(board, neighbour) === value,
        )
      ) return true
    }
  }
  return false
}

function collectBoardIssues(
  instance: SuguruPuzzleInstance,
  board: SuguruBoard,
): ValidationIssue[] {
  const { regions, regionCount } = instance.question
  if (!hasValidConnectedRegions(regions, regionCount)) {
    return [{ code: 'invalid-regions', message: 'The region layout is invalid.' }]
  }
  if (!hasMatchingBoardShape(instance, board)) {
    return [{ code: 'invalid-board', message: 'The board shape does not match the regions.' }]
  }

  const issues: ValidationIssue[] = []
  for (let row = 0; row < board.rowCount; row += 1) {
    for (let col = 0; col < board.columnCount; col += 1) {
      const value = board.cells[row]?.[col]
      if (value === null) continue
      const regionId = regions.cells[row]?.[col]
      if (
        regionId === undefined ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > regionSize(regions, regionId)
      ) {
        issues.push({
          code: 'value-out-of-range',
          message: `Cell ${row + 1},${col + 1} has a value outside its region range.`,
          path: ['cell', row, col],
        })
      }
    }
  }

  for (let regionId = 0; regionId < regionCount; regionId += 1) {
    if (regionHasDuplicateValues(instance, board, regionId)) {
      issues.push({
        code: 'duplicate-region',
        message: `Region ${regionId + 1} has a duplicate value.`,
        path: ['region', regionId],
      })
    }
  }

  for (let row = 0; row < board.rowCount; row += 1) {
    for (let col = 0; col < board.columnCount; col += 1) {
      const value = board.cells[row]?.[col]
      if (value === null || value === undefined) continue
      const position = { row, col }
      const duplicate = surroundingCells(regions, position).some(
        (neighbour) =>
          (neighbour.row > row || (neighbour.row === row && neighbour.col > col)) &&
          getCell(board, neighbour) === value,
      )
      if (duplicate) {
        issues.push({
          code: 'equal-touching',
          message: `Cell ${row + 1},${col + 1} touches an equal value.`,
          path: ['cell', row, col],
        })
      }
    }
  }
  return issues
}

export function isValidPartialBoard(
  instance: SuguruPuzzleInstance,
  board: SuguruBoard,
): boolean {
  return collectBoardIssues(instance, board).length === 0
}

export function isValidSuguruSolution(
  instance: SuguruPuzzleInstance,
  solution: SuguruBoard | SuguruSolution,
): boolean {
  return (
    solution.cells.every((row) => row.every((value) => value !== null)) &&
    isValidPartialBoard(instance, solution)
  )
}

export function isLegalSuguruMove(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
  move: SuguruMove,
): boolean {
  if (
    !isInBounds(instance.question.regions, move) ||
    getCell(instance.question.givens, move) !== null
  ) return false
  if (move.value === null) return true
  return isValidPartialBoard(instance, setCell(mergeSuguruBoard(instance, state), move, move.value))
}

export function isSuguruCellConflicting(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
  position: Position,
): boolean {
  const board = mergeSuguruBoard(instance, state)
  const value = getCell(board, position)
  const regionId = getCell(instance.question.regions, position)
  if (value === null || value === undefined || regionId === undefined) return false
  if (!Number.isInteger(value) || value < 1 || value > regionSize(instance.question.regions, regionId)) {
    return true
  }
  if (regionHasDuplicateValues(instance, board, regionId)) return true
  return surroundingCells(instance.question.regions, position).some(
    (neighbour) => getCell(board, neighbour) === value,
  )
}

export function validateSuguru(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
): ValidationResult {
  const issues: ValidationIssue[] = []
  if (!hasMatchingBoardShape(instance, state.entries)) {
    issues.push({ code: 'invalid-player-state', message: 'The player grid has the wrong shape.' })
  } else {
    for (let row = 0; row < state.entries.rowCount; row += 1) {
      for (let col = 0; col < state.entries.columnCount; col += 1) {
        if (
          instance.question.givens.cells[row]?.[col] !== null &&
          state.entries.cells[row]?.[col] !== null
        ) {
          issues.push({
            code: 'modified-given',
            message: 'Given cells cannot contain player entries.',
            path: ['cell', row, col],
          })
        }
      }
    }
  }
  const board = mergeSuguruBoard(instance, state)
  issues.push(...collectBoardIssues(instance, board))
  const complete =
    issues.length === 0 && board.cells.every((row) => row.every((value) => value !== null))
  return { valid: issues.length === 0, complete, issues }
}

export function isSuguruSolved(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
): boolean {
  return validateSuguru(instance, state).complete
}
