<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch, type CSSProperties } from 'vue'
import {
  applyGameMove,
  canRedo,
  canUndo,
  completeGame,
  createGameSession,
  redoGameMove,
  resetGame,
  undoGameMove,
  type GameSession,
} from '../../core/game'
import { getCell } from '../../core/grid'
import { getNumericEntryIntent, useGridSelection } from '../shared/gridInput'
import { generateSuguru } from './generator'
import {
  clearSuguruProgress,
  loadSuguruProgress,
  saveSuguruProgress,
} from './persistence'
import { regionSize } from './regions'
import { applySuguruMove, createInitialSuguruState, mergeSuguruBoard } from './state'
import type { SuguruMove, SuguruPlayerState } from './types'
import { isSuguruCellConflicting, isSuguruSolved } from './validator'

const props = defineProps<{ seed: string }>()
const boardElement = ref<HTMLElement | null>(null)
const puzzle = computed(() => generateSuguru({ seed: props.seed }))
const rowCount = computed(() => puzzle.value.question.regions.rowCount)
const columnCount = computed(() => puzzle.value.question.regions.columnCount)
const selection = useGridSelection(rowCount, columnCount)

function createSession(): GameSession<SuguruPlayerState, SuguruMove> {
  const initialState = createInitialSuguruState(puzzle.value)
  const fresh = createGameSession<SuguruPlayerState, SuguruMove>(initialState)
  const restored = loadSuguruProgress(localStorage, props.seed, puzzle.value)
  if (restored === null) return fresh
  return {
    ...fresh,
    history: { ...fresh.history, currentState: restored.state },
    completion: isSuguruSolved(puzzle.value, restored.state) ? 'completed' : 'in-progress',
  }
}

const session = shallowRef(createSession())
const state = computed(() => session.value.history.currentState)
const board = computed(() => mergeSuguruBoard(puzzle.value, state.value))
const solved = computed(() => session.value.completion === 'completed')
const undoAvailable = computed(() => canUndo(session.value.history))
const redoAvailable = computed(() => canRedo(session.value.history))
const selectedMaximum = computed(() => {
  const active = selection.activePosition.value
  if (active === null) return 0
  const regionId = getCell(puzzle.value.question.regions, active)
  return regionId === undefined ? 0 : regionSize(puzzle.value.question.regions, regionId)
})

watch(
  () => props.seed,
  () => {
    selection.clear()
    session.value = createSession()
  },
)

function isGiven(row: number, col: number): boolean {
  return puzzle.value.question.givens.cells[row]?.[col] !== null
}

function selectCell(row: number, col: number): void {
  selection.select({ row, col })
  void nextTick(() => boardElement.value?.focus())
}

function persist(): void {
  saveSuguruProgress(localStorage, props.seed, state.value, solved.value)
}

function updateCompletion(
  next: GameSession<SuguruPlayerState, SuguruMove>,
): GameSession<SuguruPlayerState, SuguruMove> {
  return isSuguruSolved(puzzle.value, next.history.currentState)
    ? completeGame(next, Date.now())
    : next
}

function commit(move: SuguruMove): void {
  const nextState = applySuguruMove(puzzle.value, state.value, move)
  if (nextState === state.value) return
  session.value = updateCompletion(
    applyGameMove(
      session.value,
      move,
      (current, currentMove) => applySuguruMove(puzzle.value, current, currentMove),
      Date.now(),
    ),
  )
  persist()
}

function enterValue(value: number | null): void {
  const active = selection.activePosition.value
  if (active === null || solved.value) return
  if (value !== null && value > selectedMaximum.value) return
  commit({ ...active, value })
}

function undoMove(): void {
  session.value = updateCompletion(undoGameMove(session.value, Date.now()))
  persist()
}

function redoMove(): void {
  session.value = updateCompletion(redoGameMove(session.value, Date.now()))
  persist()
}

function resetPuzzle(): void {
  session.value = resetGame(session.value)
  selection.clear()
  clearSuguruProgress(localStorage, props.seed)
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redoMove() : undoMove()
    return
  }
  const directions: Record<string, readonly [number, number]> = {
    arrowup: [-1, 0], w: [-1, 0],
    arrowright: [0, 1], d: [0, 1],
    arrowdown: [1, 0], s: [1, 0],
    arrowleft: [0, -1], a: [0, -1],
  }
  const direction = directions[event.key.toLowerCase()]
  if (direction !== undefined) {
    event.preventDefault()
    selection.move(direction[0], direction[1])
    return
  }
  const numericIntent = getNumericEntryIntent(event, 1, selectedMaximum.value)
  if (numericIntent !== null) {
    event.preventDefault()
    enterValue(numericIntent.value)
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    enterValue(null)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    selection.clear()
  }
}

function cellStyle(row: number, col: number): CSSProperties {
  const regions = puzzle.value.question.regions.cells
  const regionId = regions[row]?.[col]
  const edge = '3px solid #172033'
  const inner = '1px solid #aeb6c3'
  return {
    borderTop: row === 0 || regions[row - 1]?.[col] !== regionId ? edge : inner,
    borderRight:
      col === columnCount.value - 1 || regions[row]?.[col + 1] !== regionId ? edge : inner,
    borderBottom:
      row === rowCount.value - 1 || regions[row + 1]?.[col] !== regionId ? edge : inner,
    borderLeft: col === 0 || regions[row]?.[col - 1] !== regionId ? edge : inner,
  }
}

function isConflicting(row: number, col: number): boolean {
  return isSuguruCellConflicting(puzzle.value, state.value, { row, col })
}

function cellLabel(row: number, col: number): string {
  const value = board.value.cells[row]?.[col]
  const regionId = puzzle.value.question.regions.cells[row]?.[col] as number
  const maximum = regionSize(puzzle.value.question.regions, regionId)
  return `Row ${row + 1}, column ${col + 1}, ${value ?? 'empty'}, region values 1 to ${maximum}`
}
</script>

<template>
  <div class="suguru-game">
    <p class="seed">Seed: <code>{{ seed }}</code></p>
    <p v-if="solved" class="solved" role="status">Completed — nice work!</p>
    <p v-else class="instructions">
      Fill each region with 1 through its size. Equal numbers cannot touch, including diagonally.
      Move with arrows or WASD; conflicts are shown in red.
    </p>

    <div
      ref="boardElement"
      class="suguru-board"
      role="grid"
      aria-label="Suguru board"
      tabindex="0"
      :style="{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gridTemplateRows: `repeat(${rowCount}, 1fr)`,
        aspectRatio: `${columnCount} / ${rowCount}`,
      }"
      @keydown="handleKeydown"
    >
      <button
        v-for="(_, index) in rowCount * columnCount"
        :key="index"
        type="button"
        role="gridcell"
        tabindex="-1"
        class="suguru-cell"
        :class="{
          given: isGiven(Math.floor(index / columnCount), index % columnCount),
          entered: !isGiven(Math.floor(index / columnCount), index % columnCount),
          selected: selection.isSelected({ row: Math.floor(index / columnCount), col: index % columnCount }),
          conflict: isConflicting(Math.floor(index / columnCount), index % columnCount),
        }"
        :style="cellStyle(Math.floor(index / columnCount), index % columnCount)"
        :aria-label="cellLabel(Math.floor(index / columnCount), index % columnCount)"
        :aria-selected="selection.isSelected({ row: Math.floor(index / columnCount), col: index % columnCount })"
        @click="selectCell(Math.floor(index / columnCount), index % columnCount)"
      >
        {{ board.cells[Math.floor(index / columnCount)]?.[index % columnCount] ?? '' }}
      </button>
    </div>

    <div class="number-pad" aria-label="Number controls">
      <template v-if="selectedMaximum > 0">
        <button
          v-for="value in selectedMaximum"
          :key="value"
          type="button"
          @click="enterValue(value)"
        >{{ value }}</button>
      </template>
      <span v-else class="select-prompt">Select a cell to see its region's values.</span>
      <button type="button" :disabled="selection.activePosition.value === null" @click="enterValue(null)">
        Clear
      </button>
    </div>

    <div class="game-actions">
      <button type="button" :disabled="!undoAvailable" @click="undoMove">Undo</button>
      <button type="button" :disabled="!redoAvailable" @click="redoMove">Redo</button>
      <button type="button" @click="resetPuzzle">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.suguru-game { max-width: 34rem; }
.seed, .instructions, .select-prompt { color: #68758a; }
.solved { color: #23723c; font-weight: 700; }
.suguru-board {
  display: grid;
  width: min(100%, 31rem);
  outline-offset: 0.3rem;
  user-select: none;
}
.suguru-cell {
  min-width: 0;
  min-height: 0;
  padding: 0;
  border-radius: 0;
  color: #315c9a;
  background: #fff;
  font: inherit;
  font-size: clamp(1.1rem, 6vw, 1.8rem);
  font-weight: 700;
  cursor: pointer;
}
.suguru-cell.given { color: #172033; background: #f0f2f5; }
.suguru-cell.selected { background: #dbe9ff; box-shadow: inset 0 0 0 3px #244f8d; z-index: 1; }
.suguru-cell.conflict { color: #a52f2f; background: #ffe5e5; }
.suguru-cell.selected.conflict { box-shadow: inset 0 0 0 3px #a52f2f; }
.number-pad, .game-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; margin-top: 1rem; }
.number-pad button, .game-actions button {
  min-width: 2.5rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid #b8c0cc;
  border-radius: 0.35rem;
  background: #fff;
  cursor: pointer;
}
button:disabled { cursor: default; opacity: 0.55; }
</style>
