import { createFilledGrid, getCell, isInBounds, setCell, type Grid, type Position } from '../../core/grid'

export interface NumericGridPlayerState<TValue extends number = number> {
  readonly entries: Grid<TValue | null>
  readonly hints: Grid<readonly TValue[]>
}

export interface NumericGridValueMove<TValue extends number = number> {
  readonly kind: 'value'
  readonly positions: readonly Position[]
  readonly value: TValue | null
}

export interface NumericGridHintMove<TValue extends number = number> {
  readonly kind: 'hint'
  readonly positions: readonly Position[]
  readonly digit: TValue
  readonly enabled: boolean
}

export type NumericGridMove<TValue extends number = number> =
  | NumericGridValueMove<TValue>
  | NumericGridHintMove<TValue>

export interface NumericGridMoveRules<TValue extends number = number> {
  readonly givens: Grid<TValue | null>
  isValueAllowed(value: number, position: Position): value is TValue
  peers(position: Position): readonly Position[]
}

export function createNumericGridState<TValue extends number>(
  rowCount: number,
  columnCount: number,
): NumericGridPlayerState<TValue> {
  return {
    entries: createFilledGrid<TValue | null>(rowCount, columnCount, null),
    hints: createFilledGrid<readonly TValue[]>(rowCount, columnCount, []),
  }
}

/**
 * Pure value/hint reducer shared by numeric grid puzzles. Puzzle modules supply value ranges,
 * immutable givens, and their own peer relationship (row/box, region/neighbours, and so on).
 */
export function applyNumericGridMove<TValue extends number>(
  state: NumericGridPlayerState<TValue>,
  move: NumericGridMove<TValue>,
  rules: NumericGridMoveRules<TValue>,
): NumericGridPlayerState<TValue> {
  let entries = state.entries
  let hints = state.hints
  let changed = false
  const seen = new Set<string>()

  for (const position of move.positions) {
    const key = `${position.row}:${position.col}`
    if (seen.has(key)) continue
    seen.add(key)
    if (!isInBounds(rules.givens, position) || getCell(rules.givens, position) !== null) continue

    if (move.kind === 'value') {
      if (move.value !== null && !rules.isValueAllowed(move.value, position)) continue
      if (getCell(entries, position) !== move.value) {
        entries = setCell(entries, position, move.value)
        changed = true
      }
      if ((getCell(hints, position)?.length ?? 0) > 0) {
        hints = setCell(hints, position, [])
        changed = true
      }
      if (move.value === null) continue

      for (const peer of rules.peers(position)) {
        const peerHints = getCell(hints, peer) ?? []
        if (!peerHints.includes(move.value)) continue
        hints = setCell(hints, peer, peerHints.filter((digit) => digit !== move.value))
        changed = true
      }
      continue
    }

    if (!rules.isValueAllowed(move.digit, position) || getCell(entries, position) !== null) continue
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

export function mergeNumericGrid<TValue extends number>(
  givens: Grid<TValue | null>,
  entries: Grid<TValue | null>,
): Grid<TValue | null> {
  return {
    rowCount: givens.rowCount,
    columnCount: givens.columnCount,
    cells: Array.from({ length: givens.rowCount }, (_, row) =>
      Array.from(
        { length: givens.columnCount },
        (_, col) => givens.cells[row]?.[col] ?? entries.cells[row]?.[col] ?? null,
      ),
    ),
  }
}
