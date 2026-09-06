import type { PuzzleModule } from '../core/puzzle'
import { sudokuModule } from './sudoku'

const puzzleModules: readonly PuzzleModule[] = [sudokuModule]

const modulesById = new Map(puzzleModules.map((module) => [module.id, module]))

export function getPuzzleModule(id: string): PuzzleModule | undefined {
  return modulesById.get(id)
}

export function getPuzzleModules(): readonly PuzzleModule[] {
  return puzzleModules
}
