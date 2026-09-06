import type { Grid } from '../../core/grid'
import { isValidPartialBoard } from './validator'
import type {
  SudokuBoard,
  SudokuDigit,
  SudokuPuzzleInstance,
  SudokuSolution,
} from './types'

const ALL_DIGITS_MASK = 0b1111111110

function sourceBoard(input: SudokuBoard | SudokuPuzzleInstance): SudokuBoard {
  return 'question' in input ? input.question.givens : input
}

interface SearchResult {
  readonly count: number
  readonly firstSolution: SudokuSolution | null
}

function search(input: SudokuBoard | SudokuPuzzleInstance, limit: number): SearchResult {
  const board = sourceBoard(input)
  if (limit <= 0 || !isValidPartialBoard(board)) return { count: 0, firstSolution: null }

  const values = new Uint8Array(81)
  const rowMasks = new Uint16Array(9)
  const columnMasks = new Uint16Array(9)
  const boxMasks = new Uint16Array(9)

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board.cells[row]?.[col]
      if (value !== null && value !== undefined) {
        const index = row * 9 + col
        const bit = 1 << value
        values[index] = value
        rowMasks[row] |= bit
        columnMasks[col] |= bit
        boxMasks[Math.floor(row / 3) * 3 + Math.floor(col / 3)] |= bit
      }
    }
  }

  let count = 0
  let firstValues: Uint8Array | null = null

  const visit = (): void => {
    if (count >= limit) return

    let bestIndex = -1
    let bestMask = 0
    let fewestCandidates = 10

    for (let index = 0; index < 81; index += 1) {
      if (values[index] !== 0) continue
      const row = Math.floor(index / 9)
      const col = index % 9
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3)
      const candidates = ALL_DIGITS_MASK & ~(rowMasks[row]! | columnMasks[col]! | boxMasks[box]!)
      const candidateCount = candidates.toString(2).replaceAll('0', '').length
      if (candidateCount === 0) return
      if (candidateCount < fewestCandidates) {
        bestIndex = index
        bestMask = candidates
        fewestCandidates = candidateCount
        if (candidateCount === 1) break
      }
    }

    if (bestIndex === -1) {
      count += 1
      if (firstValues === null) firstValues = values.slice()
      return
    }

    const row = Math.floor(bestIndex / 9)
    const col = bestIndex % 9
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3)
    for (let digit = 1; digit <= 9 && count < limit; digit += 1) {
      const bit = 1 << digit
      if ((bestMask & bit) === 0) continue

      values[bestIndex] = digit
      rowMasks[row]! |= bit
      columnMasks[col]! |= bit
      boxMasks[box]! |= bit
      visit()
      values[bestIndex] = 0
      rowMasks[row]! &= ~bit
      columnMasks[col]! &= ~bit
      boxMasks[box]! &= ~bit
    }
  }

  visit()

  let firstSolution: SudokuSolution | null = null
  if (firstValues !== null) {
    const solvedValues = firstValues as Uint8Array
    const cells = Array.from({ length: 9 }, (_, row) =>
      Array.from({ length: 9 }, (_, col) => solvedValues[row * 9 + col] as SudokuDigit),
    )
    firstSolution = { rowCount: 9, columnCount: 9, cells } satisfies Grid<SudokuDigit>
  }

  return { count, firstSolution }
}

/** Deterministic backtracking with minimum-remaining-value cell selection. */
export function solve(input: SudokuBoard | SudokuPuzzleInstance): SudokuSolution | null {
  return search(input, 1).firstSolution
}

/** Counts solutions only up to limit, allowing uniqueness checks to stop at two. */
export function countSolutions(
  input: SudokuBoard | SudokuPuzzleInstance,
  limit = Number.POSITIVE_INFINITY,
): number {
  if (Number.isNaN(limit) || limit <= 0) return 0
  return search(input, Math.floor(limit)).count
}

