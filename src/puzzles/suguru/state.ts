import type { Position } from '../../core/grid'
import {
  applyNumericGridMove,
  createNumericGridState,
  mergeNumericGrid,
} from '../shared/numericGridState'
import { cellsInRegion, regionSize, surroundingCells } from './regions'
import type {
  SuguruBoard,
  SuguruMove,
  SuguruPlayerState,
  SuguruPuzzleInstance,
} from './types'

export function createInitialSuguruState(instance: SuguruPuzzleInstance): SuguruPlayerState {
  const { rowCount, columnCount } = instance.question.regions
  return createNumericGridState<number>(rowCount, columnCount)
}

export function applySuguruMove(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
  move: SuguruMove,
): SuguruPlayerState {
  const { regions, givens } = instance.question
  const isValueAllowed = (value: number, position: Position): value is number => {
    const regionId = regions.cells[position.row]?.[position.col]
    return (
      regionId !== undefined &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= regionSize(regions, regionId)
    )
  }
  const peers = (position: Position): Position[] => {
    const regionId = regions.cells[position.row]?.[position.col]
    if (regionId === undefined) return []
    const byKey = new Map<string, Position>()
    for (const peer of [...cellsInRegion(regions, regionId), ...surroundingCells(regions, position)]) {
      if (peer.row === position.row && peer.col === position.col) continue
      byKey.set(`${peer.row}:${peer.col}`, peer)
    }
    return [...byKey.values()]
  }
  return applyNumericGridMove(state, move, { givens, isValueAllowed, peers })
}

export function mergeSuguruBoard(
  instance: SuguruPuzzleInstance,
  state: SuguruPlayerState,
): SuguruBoard {
  return mergeNumericGrid(instance.question.givens, state.entries)
}
