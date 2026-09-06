import { getCell, setCell } from '../../core/grid'
import type { ValidationIssue, ValidationResult } from '../../core/puzzle'
import { isSudokuDigit, mergeSudokuBoard, SUDOKU_SIZE } from './state'
import type {
  SudokuBoard,
  SudokuCell,
  SudokuMove,
  SudokuPlayerState,
  SudokuPuzzleInstance,
} from './types'

export function hasDuplicateNonEmptyValues(values: readonly SudokuCell[]): boolean {
  const seen = new Set<number>()
  for (const value of values) {
    if (value !== null) {
      if (seen.has(value)) return true
      seen.add(value)
    }
  }
  return false
}

export function rowHasDuplicateValues(board: SudokuBoard, row: number): boolean {
  const values = board.cells[row]
  return values === undefined ? false : hasDuplicateNonEmptyValues(values)
}

export function columnHasDuplicateValues(board: SudokuBoard, col: number): boolean {
  if (col < 0 || col >= board.columnCount) return false
  return hasDuplicateNonEmptyValues(board.cells.map((row) => row[col] ?? null))
}

export function boxHasDuplicateValues(
  board: SudokuBoard,
  boxRow: number,
  boxCol: number,
): boolean {
  if (boxRow < 0 || boxRow > 2 || boxCol < 0 || boxCol > 2) return false

  const values: SudokuCell[] = []
  for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
    for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
      values.push(board.cells[row]?.[col] ?? null)
    }
  }
  return hasDuplicateNonEmptyValues(values)
}

function hasValidShapeAndValues(board: SudokuBoard, allowEmpty: boolean): boolean {
  return (
    board.rowCount === SUDOKU_SIZE &&
    board.columnCount === SUDOKU_SIZE &&
    board.cells.length === SUDOKU_SIZE &&
    board.cells.every(
      (row) =>
        row.length === SUDOKU_SIZE &&
        row.every((value) => (allowEmpty && value === null) || isSudokuDigit(value)),
    )
  )
}

export function isValidPartialBoard(board: SudokuBoard): boolean {
  if (!hasValidShapeAndValues(board, true)) return false

  for (let index = 0; index < SUDOKU_SIZE; index += 1) {
    if (rowHasDuplicateValues(board, index) || columnHasDuplicateValues(board, index)) {
      return false
    }
  }
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      if (boxHasDuplicateValues(board, boxRow, boxCol)) return false
    }
  }
  return true
}

export function isValidSudokuSolution(board: SudokuBoard): boolean {
  return hasValidShapeAndValues(board, false) && isValidPartialBoard(board)
}

export function isValidSudokuMove(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
  move: SudokuMove,
): boolean {
  const given = getCell(instance.question.givens, move)
  if (given === undefined || given !== null) return false
  if (move.value === null) return true
  if (!isSudokuDigit(move.value)) return false

  return isValidPartialBoard(setCell(mergeSudokuBoard(instance, state), move, move.value))
}

export function isSudokuSolved(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
): boolean {
  return isValidSudokuSolution(mergeSudokuBoard(instance, state))
}

function collectIssues(board: SudokuBoard): ValidationIssue[] {
  if (!hasValidShapeAndValues(board, true)) {
    return [{ code: 'invalid-board', message: 'The board must be a 9×9 grid of Sudoku values.' }]
  }

  const issues: ValidationIssue[] = []
  for (let index = 0; index < SUDOKU_SIZE; index += 1) {
    if (rowHasDuplicateValues(board, index)) {
      issues.push({ code: 'duplicate-row', message: `Row ${index + 1} has a duplicate.`, path: ['row', index] })
    }
    if (columnHasDuplicateValues(board, index)) {
      issues.push({ code: 'duplicate-column', message: `Column ${index + 1} has a duplicate.`, path: ['column', index] })
    }
  }
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      if (boxHasDuplicateValues(board, boxRow, boxCol)) {
        issues.push({
          code: 'duplicate-box',
          message: `Box ${boxRow * 3 + boxCol + 1} has a duplicate.`,
          path: ['box', boxRow, boxCol],
        })
      }
    }
  }
  return issues
}

export function validateSudoku(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
): ValidationResult {
  const board = mergeSudokuBoard(instance, state)
  const issues = collectIssues(board)
  const complete = board.cells.every((row) => row.every((value) => value !== null))
  return { valid: issues.length === 0, complete: complete && issues.length === 0, issues }
}

