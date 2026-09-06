import { describe, expect, it } from 'vitest'
import {
  cloneGrid,
  createGrid,
  getCell,
  getColumn,
  getDiagonalNeighbours,
  getOrthogonalNeighbours,
  getRow,
  getSurroundingNeighbours,
  isInBounds,
  mapGrid,
  positions,
  setCell,
} from '../src/core/grid'

describe('grid primitives', () => {
  const grid = createGrid(2, 3, ({ row, col }) => row * 10 + col)

  it('creates rectangular grids and looks up cells', () => {
    expect(grid.rowCount).toBe(2)
    expect(grid.columnCount).toBe(3)
    expect(grid.cells).toEqual([[0, 1, 2], [10, 11, 12]])
    expect(getCell(grid, { row: 1, col: 2 })).toBe(12)
    expect(getCell(grid, { row: 2, col: 0 })).toBeUndefined()
  })

  it('checks bounds for rows, columns, and integer coordinates', () => {
    expect(isInBounds(grid, { row: 0, col: 0 })).toBe(true)
    expect(isInBounds(grid, { row: 1, col: 2 })).toBe(true)
    expect(isInBounds(grid, { row: -1, col: 0 })).toBe(false)
    expect(isInBounds(grid, { row: 0, col: 3 })).toBe(false)
    expect(isInBounds(grid, { row: 0.5, col: 1 })).toBe(false)
  })

  it('retrieves rows and columns', () => {
    expect(getRow(grid, 1)).toEqual([10, 11, 12])
    expect(getColumn(grid, 1)).toEqual([1, 11])
    expect(getRow(grid, 2)).toBeUndefined()
    expect(getColumn(grid, -1)).toBeUndefined()
  })

  it('gets orthogonal, diagonal, and surrounding neighbours', () => {
    const largerGrid = createGrid(3, 4, () => null)
    const center = { row: 1, col: 1 }
    expect(getOrthogonalNeighbours(largerGrid, center)).toEqual([
      { row: 0, col: 1 }, { row: 1, col: 2 },
      { row: 2, col: 1 }, { row: 1, col: 0 },
    ])
    expect(getDiagonalNeighbours(largerGrid, center)).toEqual([
      { row: 0, col: 0 }, { row: 0, col: 2 },
      { row: 2, col: 2 }, { row: 2, col: 0 },
    ])
    expect(getSurroundingNeighbours(largerGrid, center)).toHaveLength(8)
  })

  it('limits neighbours correctly at corners and edges', () => {
    const largerGrid = createGrid(3, 4, () => null)
    expect(getOrthogonalNeighbours(largerGrid, { row: 0, col: 0 })).toEqual([
      { row: 0, col: 1 }, { row: 1, col: 0 },
    ])
    expect(getDiagonalNeighbours(largerGrid, { row: 0, col: 0 })).toEqual([
      { row: 1, col: 1 },
    ])
    expect(getSurroundingNeighbours(largerGrid, { row: 0, col: 2 })).toHaveLength(5)
  })

  it('sets, maps, and iterates without changing the original grid', () => {
    const changed = setCell(grid, { row: 0, col: 1 }, 99)
    const doubled = mapGrid(grid, (value) => value * 2)
    expect(getCell(changed, { row: 0, col: 1 })).toBe(99)
    expect(getCell(grid, { row: 0, col: 1 })).toBe(1)
    expect(doubled.cells).toEqual([[0, 2, 4], [20, 22, 24]])
    expect([...positions(grid)]).toHaveLength(6)
  })

  it('clones the grid structure independently', () => {
    const cloned = cloneGrid(grid)
    const changedClone = setCell(cloned, { row: 1, col: 1 }, 77)
    expect(cloned).not.toBe(grid)
    expect(cloned.cells[0]).not.toBe(grid.cells[0])
    expect(getCell(changedClone, { row: 1, col: 1 })).toBe(77)
    expect(getCell(grid, { row: 1, col: 1 })).toBe(11)
  })
})
