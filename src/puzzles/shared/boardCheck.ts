import type { Grid, Position } from '../../core/grid'

/** Finds filled player cells that disagree with a known solution. */
export function findIncorrectFilledPositions<TEntry, TSolution>(
  entries: Grid<TEntry>,
  solution: Grid<TSolution>,
  isFilled: (entry: TEntry, position: Position) => boolean,
  isCorrect: (entry: TEntry, answer: TSolution, position: Position) => boolean,
): Position[] {
  if (
    entries.rowCount !== solution.rowCount ||
    entries.columnCount !== solution.columnCount
  ) return []

  const incorrect: Position[] = []
  for (let row = 0; row < entries.rowCount; row += 1) {
    for (let col = 0; col < entries.columnCount; col += 1) {
      const entry = entries.cells[row]?.[col]
      const answer = solution.cells[row]?.[col]
      if (entry === undefined || answer === undefined) continue
      const position = { row, col }
      if (isFilled(entry, position) && !isCorrect(entry, answer, position)) {
        incorrect.push(position)
      }
    }
  }
  return incorrect
}

export function positionKey(position: Position): string {
  return `${position.row}:${position.col}`
}

export function positionKeySet(positions: readonly Position[]): ReadonlySet<string> {
  return new Set(positions.map(positionKey))
}
