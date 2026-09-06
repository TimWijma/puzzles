import type { Grid, Position } from './types'

type CellFactory<T> = (position: Position) => T

function assertDimension(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`)
  }
}

export function createGrid<T>(
  rowCount: number,
  columnCount: number,
  createCell: CellFactory<T>,
): Grid<T> {
  assertDimension(rowCount, 'rowCount')
  assertDimension(columnCount, 'columnCount')

  return {
    rowCount,
    columnCount,
    cells: Array.from({ length: rowCount }, (_, row) =>
      Array.from({ length: columnCount }, (_, col) => createCell({ row, col })),
    ),
  }
}

export function createFilledGrid<T>(
  rowCount: number,
  columnCount: number,
  value: T,
): Grid<T> {
  return createGrid(rowCount, columnCount, () => value)
}

export function isInBounds<T>(grid: Grid<T>, position: Position): boolean {
  return (
    Number.isInteger(position.row) &&
    Number.isInteger(position.col) &&
    position.row >= 0 &&
    position.row < grid.rowCount &&
    position.col >= 0 &&
    position.col < grid.columnCount
  )
}

export function getCell<T>(grid: Grid<T>, position: Position): T | undefined {
  if (!isInBounds(grid, position)) {
    return undefined
  }

  return grid.cells[position.row]?.[position.col]
}

export function setCell<T>(grid: Grid<T>, position: Position, value: T): Grid<T> {
  if (!isInBounds(grid, position)) {
    throw new RangeError(`Position (${position.row}, ${position.col}) is outside the grid`)
  }

  return {
    ...grid,
    cells: grid.cells.map((row, rowIndex) =>
      rowIndex === position.row
        ? row.map((cell, colIndex) => (colIndex === position.col ? value : cell))
        : row,
    ),
  }
}

export function updateCell<T>(
  grid: Grid<T>,
  position: Position,
  update: (value: T) => T,
): Grid<T> {
  const current = getCell(grid, position)
  if (current === undefined && !isInBounds(grid, position)) {
    throw new RangeError(`Position (${position.row}, ${position.col}) is outside the grid`)
  }

  return setCell(grid, position, update(current as T))
}

export function getRow<T>(grid: Grid<T>, row: number): readonly T[] | undefined {
  if (!Number.isInteger(row) || row < 0 || row >= grid.rowCount) {
    return undefined
  }

  return grid.cells[row]
}

export function getColumn<T>(grid: Grid<T>, col: number): readonly T[] | undefined {
  if (!Number.isInteger(col) || col < 0 || col >= grid.columnCount) {
    return undefined
  }

  return grid.cells.map((row) => row[col] as T)
}

const orthogonalOffsets: readonly Position[] = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
]

const diagonalOffsets: readonly Position[] = [
  { row: -1, col: -1 },
  { row: -1, col: 1 },
  { row: 1, col: 1 },
  { row: 1, col: -1 },
]

function neighboursForOffsets<T>(
  grid: Grid<T>,
  position: Position,
  offsets: readonly Position[],
): Position[] {
  return offsets
    .map((offset) => ({ row: position.row + offset.row, col: position.col + offset.col }))
    .filter((neighbour) => isInBounds(grid, neighbour))
}

export function getOrthogonalNeighbours<T>(grid: Grid<T>, position: Position): Position[] {
  return neighboursForOffsets(grid, position, orthogonalOffsets)
}

export function getDiagonalNeighbours<T>(grid: Grid<T>, position: Position): Position[] {
  return neighboursForOffsets(grid, position, diagonalOffsets)
}

export function getSurroundingNeighbours<T>(grid: Grid<T>, position: Position): Position[] {
  return neighboursForOffsets(grid, position, [...orthogonalOffsets, ...diagonalOffsets])
}

export function* positions<T>(grid: Grid<T>): Generator<Position> {
  for (let row = 0; row < grid.rowCount; row += 1) {
    for (let col = 0; col < grid.columnCount; col += 1) {
      yield { row, col }
    }
  }
}

export function mapGrid<T, U>(
  grid: Grid<T>,
  mapCell: (value: T, position: Position) => U,
): Grid<U> {
  return createGrid(grid.rowCount, grid.columnCount, (position) =>
    mapCell(grid.cells[position.row]?.[position.col] as T, position),
  )
}

/** Creates a new grid structure. Cell values themselves are copied by reference. */
export function cloneGrid<T>(grid: Grid<T>): Grid<T> {
  return {
    rowCount: grid.rowCount,
    columnCount: grid.columnCount,
    cells: grid.cells.map((row) => [...row]),
  }
}
