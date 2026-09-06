export interface Position {
  readonly row: number
  readonly col: number
}

/**
 * A rectangular, zero-indexed grid. Rows and cells are exposed as readonly so
 * changes go through the pure helpers in this module.
 */
export interface Grid<T> {
  readonly rowCount: number
  readonly columnCount: number
  readonly cells: ReadonlyArray<ReadonlyArray<T>>
}
