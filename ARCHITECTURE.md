# Architecture

This project separates reusable, framework-independent puzzle infrastructure from individual
puzzle rules and Vue presentation. The abstractions are deliberately small so they can evolve
after real puzzle modules expose shared needs.

## Core responsibilities

- `src/core/grid` provides rectangular grid data, bounds checks, immutable cell updates, row and
  column access, neighbour queries, position iteration, mapping, and structural cloning. It knows
  nothing about clues, legal moves, or any particular puzzle.
- `src/core/puzzle` defines contracts for immutable puzzle instances, generation, solving,
  validation, difficulty evaluation, and initial player-state creation. These contracts do not
  import Vue.
- `src/core/game` manages generic player-state history and moves, undo/redo/reset behaviour,
  completion status, and elapsed time. Move and state shapes are supplied by each puzzle.
- `src/core/random` supplies a dependency-free deterministic random source from an arbitrary
  string seed, with integer, boolean, selection, and non-mutating shuffle helpers.
- `src/puzzles` owns the puzzle registry and application-level board component lookup.
  Its `shared/gridInput.ts` helper contains reusable grid selection and numeric value/hint input
  intents for keyboard-driven puzzle boards without coupling those UI concepts to `core`.

Puzzle-specific rules belong under `src/puzzles/<puzzle-name>`. Core code must never branch on a
puzzle ID or contain logic such as Sudoku validation or Sea Battle ship detection. Keeping those
rules at the edge prevents unrelated puzzles from becoming coupled and keeps generic utilities
easy to test.

Composition is preferred over a shared `GridPuzzle` inheritance tree. A puzzle module assembles
the generator, solver, validator, difficulty evaluator, and state factory it actually needs.
This lets puzzles with different board shapes, cell types, clues, moves, player state, and solution
representations reuse only the relevant infrastructure.

## Data and state

`PuzzleInstance` is the immutable question: its clues, layout, identity, and optional metadata.
The player's mutable work is a separate type managed by the game layer. A solution is a third,
independent type. This separation keeps reset reliable, avoids writing answers into clue data,
and lets generators, solvers, validators, persistence, and UI use the narrow data they need.

Game transitions are pure: a puzzle supplies a reducer that maps current player state and a
puzzle-specific move to the next state. History stores those transitions for undo and redo. State
values should therefore be treated as immutable by puzzle reducers.

## Deterministic generation

`createSeededRandom(seed)` hashes any string seed and returns a repeatable pseudo-random stream.
Generators receive that `RandomSource` through `PuzzleGenerationContext`; they should not call
`Math.random()` directly. Reusing a seed and generator version produces the same random choices.
Seeds are identifiers such as `abc123` or `sudoku-492810` and carry no date semantics.

## Adding a puzzle

The Sudoku and Queens modules demonstrate the intended structure:

```text
src/puzzles/<puzzle-name>/
  types.ts
  validator.ts (and region helpers where applicable)
  solver.ts
  generator.ts
  state.ts
  persistence.ts
  SudokuBoard.vue
  index.ts
```

1. Define question, player-state, move, solution, metadata, and difficulty types locally.
2. Implement and unit-test the validator, solver, generator, difficulty evaluator, and state
   factory as plain TypeScript.
3. Export a `PuzzleModule` from the puzzle's `index.ts` and add it to `src/puzzles/registry.ts`.
4. Create the puzzle-specific Vue board and register its UI metadata in the application layer.
   Do not add Vue components to the core `PuzzleModule` contract.
5. Add routing or catalogue metadata without changing generic core behaviour.

UI concepts should be shared only after at least two puzzle boards demonstrate the same need.
