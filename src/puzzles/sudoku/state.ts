import { createFilledGrid, getCell, isInBounds, setCell } from '../../core/grid'
import type {
  SudokuBoard,
  SudokuCell,
  SudokuDigit,
  SudokuMove,
  SudokuPlayerState,
  SudokuPuzzleInstance,
} from './types'

export const SUDOKU_SIZE = 9

export function isSudokuDigit(value: unknown): value is SudokuDigit {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 9
}

export function createInitialSudokuState(
  _instance?: SudokuPuzzleInstance,
): SudokuPlayerState {
  return {
    entries: createFilledGrid(SUDOKU_SIZE, SUDOKU_SIZE, null),
    hints: createFilledGrid<readonly SudokuDigit[]>(SUDOKU_SIZE, SUDOKU_SIZE, []),
  }
}

export function applySudokuMove(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
  move: SudokuMove,
): SudokuPlayerState {
  let entries = state.entries
  let hints = state.hints
  let changed = false
  const seen = new Set<string>()

  for (const position of move.positions) {
    const key = `${position.row}:${position.col}`
    if (seen.has(key)) continue
    seen.add(key)
    if (
      !isInBounds(instance.question.givens, position) ||
      getCell(instance.question.givens, position) !== null
    ) {
      continue
    }

    if (move.kind === 'value') {
      if (move.value !== null && !isSudokuDigit(move.value)) continue
      if (getCell(entries, position) !== move.value) {
        entries = setCell(entries, position, move.value)
        changed = true
      }
      if ((getCell(hints, position)?.length ?? 0) > 0) {
        hints = setCell(hints, position, [])
        changed = true
      }
      continue
    }

    if (!isSudokuDigit(move.digit) || getCell(entries, position) !== null) continue
    const currentHints = getCell(hints, position) ?? []
    const nextHints = move.enabled
      ? [...new Set([...currentHints, move.digit])].sort((left, right) => left - right)
      : currentHints.filter((digit) => digit !== move.digit)
    if (nextHints.length !== currentHints.length) {
      hints = setCell(hints, position, nextHints)
      changed = true
    }
  }

  return changed ? { entries, hints } : state
}

export function mergeSudokuBoard(
  instance: SudokuPuzzleInstance,
  state: SudokuPlayerState,
): SudokuBoard {
  const cells: SudokuCell[][] = []

  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    const mergedRow: SudokuCell[] = []
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      const given = instance.question.givens.cells[row]?.[col] ?? null
      mergedRow.push(given ?? state.entries.cells[row]?.[col] ?? null)
    }
    cells.push(mergedRow)
  }

  return { rowCount: SUDOKU_SIZE, columnCount: SUDOKU_SIZE, cells }
}
