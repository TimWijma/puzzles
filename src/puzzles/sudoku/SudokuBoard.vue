<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
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
import { generateSudoku } from './generator'
import {
  clearSudokuProgress,
  loadSudokuProgress,
  saveSudokuProgress,
} from './persistence'
import { applySudokuMove, createInitialSudokuState, mergeSudokuBoard } from './state'
import type { SudokuDigit, SudokuMove, SudokuPlayerState } from './types'
import { isSudokuSolved } from './validator'

const props = defineProps<{ seed: string }>()
const boardElement = ref<HTMLElement | null>(null)
const selected = ref<{ row: number; col: number } | null>(null)
const puzzle = computed(() => generateSudoku({ seed: props.seed }))

function createSession(): GameSession<SudokuPlayerState, SudokuMove> {
  const initialState = createInitialSudokuState(puzzle.value)
  const fresh = createGameSession<SudokuPlayerState, SudokuMove>(initialState)
  const restored = loadSudokuProgress(localStorage, props.seed, puzzle.value)
  if (restored === null) return fresh

  return {
    ...fresh,
    history: { ...fresh.history, currentState: restored.state },
    completion: isSudokuSolved(puzzle.value, restored.state) ? 'completed' : 'in-progress',
  }
}

const session = shallowRef(createSession())
const playerState = computed(() => session.value.history.currentState)
const board = computed(() => mergeSudokuBoard(puzzle.value, playerState.value))
const undoAvailable = computed(() => canUndo(session.value.history))
const redoAvailable = computed(() => canRedo(session.value.history))
const solved = computed(() => session.value.completion === 'completed')

watch(
  () => props.seed,
  () => {
    selected.value = null
    session.value = createSession()
  },
)

function isGiven(row: number, col: number): boolean {
  return puzzle.value.question.givens.cells[row]?.[col] !== null
}

function selectCell(row: number, col: number): void {
  if (isGiven(row, col)) return
  selected.value = { row, col }
  void nextTick(() => boardElement.value?.focus())
}

function persist(): void {
  saveSudokuProgress(localStorage, props.seed, playerState.value, solved.value)
}

function updateCompletion(next: GameSession<SudokuPlayerState, SudokuMove>): GameSession<SudokuPlayerState, SudokuMove> {
  return isSudokuSolved(puzzle.value, next.history.currentState)
    ? completeGame(next, Date.now())
    : next
}

function enterValue(value: SudokuDigit | null): void {
  if (selected.value === null || solved.value) return
  const move: SudokuMove = { ...selected.value, value }
  const nextState = applySudokuMove(puzzle.value, playerState.value, move)
  if (nextState === playerState.value) return

  session.value = updateCompletion(
    applyGameMove(
      session.value,
      move,
      (state, currentMove) => applySudokuMove(puzzle.value, state, currentMove),
      Date.now(),
    ),
  )
  persist()
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
  selected.value = null
  clearSudokuProgress(localStorage, props.seed)
}

function moveSelection(rowDelta: number, colDelta: number): void {
  let row = selected.value?.row ?? (rowDelta < 0 ? 9 : -1)
  let col = selected.value?.col ?? (colDelta < 0 ? 9 : -1)

  for (let step = 0; step < 9; step += 1) {
    row += rowDelta
    col += colDelta
    if (row < 0 || row >= 9 || col < 0 || col >= 9) return
    if (!isGiven(row, col)) {
      selected.value = { row, col }
      return
    }
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redoMove() : undoMove()
    return
  }

  if (/^[1-9]$/.test(event.key)) {
    event.preventDefault()
    enterValue(Number(event.key) as SudokuDigit)
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    enterValue(null)
    return
  }

  const directions: Record<string, readonly [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowRight: [0, 1],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
  }
  const direction = directions[event.key]
  if (direction !== undefined) {
    event.preventDefault()
    moveSelection(direction[0], direction[1])
  }
}
</script>

<template>
  <div class="sudoku-game">
    <p class="seed">Seed: <code>{{ seed }}</code></p>
    <p v-if="solved" class="solved" role="status">Completed — nice work!</p>
    <p v-else class="instructions">Select an empty cell, then enter a digit from 1 to 9.</p>

    <div
      ref="boardElement"
      class="sudoku-board"
      role="grid"
      aria-label="Sudoku board"
      tabindex="0"
      @keydown="handleKeydown"
    >
      <button
        v-for="(_, index) in 81"
        :key="index"
        type="button"
        role="gridcell"
        class="sudoku-cell"
        :class="{
          given: isGiven(Math.floor(index / 9), index % 9),
          entered: !isGiven(Math.floor(index / 9), index % 9) && getCell(board, { row: Math.floor(index / 9), col: index % 9 }) !== null,
          selected: selected?.row === Math.floor(index / 9) && selected?.col === index % 9,
          'box-right': index % 9 === 2 || index % 9 === 5,
          'box-bottom': Math.floor(index / 9) === 2 || Math.floor(index / 9) === 5,
        }"
        :aria-label="`Row ${Math.floor(index / 9) + 1}, column ${index % 9 + 1}`"
        :aria-selected="selected?.row === Math.floor(index / 9) && selected?.col === index % 9"
        :disabled="isGiven(Math.floor(index / 9), index % 9)"
        @click="selectCell(Math.floor(index / 9), index % 9)"
      >
        {{ getCell(board, { row: Math.floor(index / 9), col: index % 9 }) ?? '' }}
      </button>
    </div>

    <div class="number-pad" aria-label="Digit controls">
      <button v-for="digit in 9" :key="digit" type="button" @click="enterValue(digit as SudokuDigit)">
        {{ digit }}
      </button>
      <button type="button" @click="enterValue(null)">Clear</button>
    </div>

    <div class="game-actions">
      <button type="button" :disabled="!undoAvailable" @click="undoMove">Undo</button>
      <button type="button" :disabled="!redoAvailable" @click="redoMove">Redo</button>
      <button type="button" @click="resetPuzzle">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.sudoku-game { max-width: 34rem; }
.seed, .instructions { color: #68758a; }
.solved { color: #23723c; font-weight: 700; }
.sudoku-board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  width: min(100%, 31.5rem);
  aspect-ratio: 1;
  border: 2px solid #172033;
  outline-offset: 0.25rem;
}
.sudoku-cell {
  min-width: 0;
  padding: 0;
  border: 0;
  border-right: 1px solid #aeb6c3;
  border-bottom: 1px solid #aeb6c3;
  border-radius: 0;
  color: #315c9a;
  background: #fff;
  font: inherit;
  font-size: clamp(1rem, 5vw, 1.5rem);
  cursor: pointer;
}
.sudoku-cell:nth-child(9n) { border-right: 0; }
.sudoku-cell:nth-last-child(-n + 9) { border-bottom: 0; }
.sudoku-cell.box-right { border-right: 2px solid #172033; }
.sudoku-cell.box-bottom { border-bottom: 2px solid #172033; }
.sudoku-cell.given { color: #172033; background: #f0f2f5; font-weight: 700; cursor: default; }
.sudoku-cell.selected { background: #dbe9ff; box-shadow: inset 0 0 0 2px #315c9a; }
.number-pad, .game-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
.number-pad button, .game-actions button {
  min-width: 2.4rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid #b8c0cc;
  border-radius: 0.3rem;
  background: #fff;
  cursor: pointer;
}
button:disabled { cursor: default; opacity: 0.55; }
</style>

