import type { PuzzleModule } from '../core/puzzle'

// Puzzle modules are registered here as they are implemented. The registry is
// intentionally empty until the first real puzzle exists.
const puzzleModules: readonly PuzzleModule[] = []

const modulesById = new Map(puzzleModules.map((module) => [module.id, module]))

export function getPuzzleModule(id: string): PuzzleModule | undefined {
  return modulesById.get(id)
}

export function getPuzzleModules(): readonly PuzzleModule[] {
  return puzzleModules
}
