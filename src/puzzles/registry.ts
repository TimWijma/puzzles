import type { PuzzleModule } from '../core/puzzle'
import { queensModule } from './queens'
import { sudokuModule } from './sudoku'

const puzzleModules: readonly PuzzleModule[] = [sudokuModule, queensModule]

const modulesById = new Map(puzzleModules.map((module) => [module.id, module]))

export function getPuzzleModule(id: string): PuzzleModule | undefined {
  return modulesById.get(id)
}

export function getPuzzleModules(): readonly PuzzleModule[] {
  return puzzleModules
}
