<script setup lang="ts">
import { computed, ref, shallowRef, watch, type CSSProperties } from 'vue'
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
import {
  findIncorrectFilledPositions,
  positionKey,
  positionKeySet,
} from '../shared/boardCheck'
import { generateQueens } from './generator'
import {
  clearQueensProgress,
  loadQueensProgress,
  saveQueensProgress,
} from './persistence'
import { applyQueensMove, createInitialQueensState } from './state'
import { solve as solveQueens } from './solver'
import type { QueensMove, QueensPlayerState } from './types'
import { isLegalQueenPlacement, isQueensSolved } from './validator'

const props = defineProps<{ seed: string }>()
const puzzle = computed(() => generateQueens({ seed: props.seed }))
const invalidCell = shallowRef<{ row: number; col: number } | null>(null)
const checkPerformed = ref(false)
const incorrectQueenKeys = shallowRef<ReadonlySet<string>>(new Set())

function createSession(): GameSession<QueensPlayerState, QueensMove> {
  const initialState = createInitialQueensState(puzzle.value)
  const fresh = createGameSession<QueensPlayerState, QueensMove>(initialState)
  const restored = loadQueensProgress(localStorage, props.seed, puzzle.value)
  if (restored === null) return fresh
  return {
    ...fresh,
    history: { ...fresh.history, currentState: restored.state },
    completion: isQueensSolved(puzzle.value, restored.state) ? 'completed' : 'in-progress',
  }
}

const session = shallowRef(createSession())
const state = computed(() => session.value.history.currentState)
const solution = computed(() => solveQueens(puzzle.value))
const size = computed(() => puzzle.value.question.regions.rowCount)
const solved = computed(() => session.value.completion === 'completed')
const undoAvailable = computed(() => canUndo(session.value.history))
const redoAvailable = computed(() => canRedo(session.value.history))
const checkMessage = computed(() => {
  if (!checkPerformed.value) return ''
  const count = incorrectQueenKeys.value.size
  return count === 0
    ? 'Every queen placed so far is correct.'
    : `${count} ${count === 1 ? 'queen is' : 'queens are'} incorrectly placed.`
})

watch(
  () => props.seed,
  () => {
    invalidCell.value = null
    clearCheckResult()
    session.value = createSession()
  },
)

function persist(): void {
  saveQueensProgress(localStorage, props.seed, state.value, solved.value)
}

function updateCompletion(next: GameSession<QueensPlayerState, QueensMove>): GameSession<QueensPlayerState, QueensMove> {
  return isQueensSolved(puzzle.value, next.history.currentState)
    ? completeGame(next, Date.now())
    : next
}

function commit(move: QueensMove): void {
  clearCheckResult()
  session.value = updateCompletion(
    applyGameMove(
      session.value,
      move,
      (current, currentMove) => applyQueensMove(puzzle.value, current, currentMove),
      Date.now(),
    ),
  )
  persist()
}

function toggleQueen(row: number, col: number): void {
  if (solved.value) return
  invalidCell.value = null
  clearCheckResult()
  if (state.value.queens.cells[row]?.[col]) {
    commit({ row, col, value: false })
    return
  }
  if (!isLegalQueenPlacement(puzzle.value, state.value, { row, col })) {
    invalidCell.value = { row, col }
    return
  }
  commit({ row, col, value: true })
}

function undoMove(): void {
  invalidCell.value = null
  clearCheckResult()
  session.value = updateCompletion(undoGameMove(session.value, Date.now()))
  persist()
}

function redoMove(): void {
  invalidCell.value = null
  clearCheckResult()
  session.value = updateCompletion(redoGameMove(session.value, Date.now()))
  persist()
}

function resetPuzzle(): void {
  session.value = resetGame(session.value)
  invalidCell.value = null
  clearCheckResult()
  clearQueensProgress(localStorage, props.seed)
}

function clearCheckResult(): void {
  checkPerformed.value = false
  incorrectQueenKeys.value = new Set()
}

function checkBoard(): void {
  const answer = solution.value
  if (answer === null) return
  incorrectQueenKeys.value = positionKeySet(findIncorrectFilledPositions(
    state.value.queens,
    answer.queens,
    (value) => value,
    (value, expected) => value === expected,
  ))
  checkPerformed.value = true
}

function isIncorrectQueen(row: number, col: number): boolean {
  return incorrectQueenKeys.value.has(positionKey({ row, col }))
}

function regionColor(regionId: number): string {
  const colors = ['#f6d5d5', '#d9e8fb', '#d9f0df', '#f7e5bd', '#e6daf5', '#d8eeee', '#f4d9ea', '#e6e2cb', '#dce1f2', '#e9ddcf']
  return colors[regionId % colors.length] as string
}

function cellStyle(row: number, col: number): CSSProperties {
  const regions = puzzle.value.question.regions.cells
  const regionId = regions[row]?.[col] as number
  const edge = '2px solid #172033'
  const inner = '1px solid rgba(23, 32, 51, 0.18)'
  return {
    backgroundColor: regionColor(regionId),
    borderTop: row === 0 || regions[row - 1]?.[col] !== regionId ? edge : inner,
    borderRight: col === size.value - 1 || regions[row]?.[col + 1] !== regionId ? edge : inner,
    borderBottom: row === size.value - 1 || regions[row + 1]?.[col] !== regionId ? edge : inner,
    borderLeft: col === 0 || regions[row]?.[col - 1] !== regionId ? edge : inner,
  }
}
</script>

<template>
  <div class="queens-game">
    <p class="seed">Seed: <code>{{ seed }}</code></p>
    <p v-if="solved" class="solved" role="status">Completed — every queen has her place.</p>
    <p v-else-if="invalidCell" class="invalid-message" role="status">
      That queen would conflict with another queen.
    </p>
    <p v-else class="instructions">
      Place one queen in every row, column, and colored region. Queens cannot touch diagonally.
    </p>
    <p
      v-if="checkPerformed"
      class="board-check-message"
      :class="incorrectQueenKeys.size === 0 ? 'correct' : 'incorrect-message'"
      role="status"
    >{{ checkMessage }}</p>

    <div
      class="queens-board"
      role="grid"
      aria-label="Queens board"
      :style="{ gridTemplateColumns: `repeat(${size}, 1fr)` }"
    >
      <button
        v-for="(_, index) in size * size"
        :key="index"
        type="button"
        role="gridcell"
        class="queens-cell"
        :class="{
          queen: state.queens.cells[Math.floor(index / size)]?.[index % size],
          invalid: invalidCell?.row === Math.floor(index / size) && invalidCell?.col === index % size,
          'incorrect-queen': isIncorrectQueen(Math.floor(index / size), index % size),
        }"
        :style="cellStyle(Math.floor(index / size), index % size)"
        :aria-label="`Row ${Math.floor(index / size) + 1}, column ${index % size + 1}${state.queens.cells[Math.floor(index / size)]?.[index % size] ? ', queen' : ''}`"
        :aria-pressed="state.queens.cells[Math.floor(index / size)]?.[index % size]"
        @click="toggleQueen(Math.floor(index / size), index % size)"
      >
        {{ state.queens.cells[Math.floor(index / size)]?.[index % size] ? '♛' : '' }}
      </button>
    </div>

    <div class="game-actions">
      <button type="button" @click="checkBoard">Check</button>
      <button type="button" :disabled="!undoAvailable" @click="undoMove">Undo</button>
      <button type="button" :disabled="!redoAvailable" @click="redoMove">Redo</button>
      <button type="button" @click="resetPuzzle">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.queens-game { max-width: 34rem; }
.seed, .instructions { color: #68758a; }
.solved { color: #23723c; font-weight: 700; }
.invalid-message { color: #a52f2f; font-weight: 600; }
.board-check-message.correct { color: #23723c; font-weight: 700; }
.board-check-message.incorrect-message { color: #a52f2f; font-weight: 700; }
.queens-board {
  display: grid;
  width: min(100%, 31.5rem);
  aspect-ratio: 1;
}
.queens-cell {
  min-width: 0;
  padding: 0;
  border-radius: 0;
  color: #172033;
  font: inherit;
  font-size: clamp(1.25rem, 6vw, 2rem);
  line-height: 1;
  cursor: pointer;
}
.queens-cell.queen { text-shadow: 0 1px 0 #fff; }
.queens-cell.invalid { box-shadow: inset 0 0 0 3px #c23a3a; }
.queens-cell.incorrect-queen { color: #a52f2f; box-shadow: inset 0 0 0 3px #c23a3a; }
.game-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
.game-actions button {
  min-width: 4rem;
  padding: 0.5rem 0.7rem;
  border: 1px solid #b8c0cc;
  border-radius: 0.3rem;
  background: #fff;
  cursor: pointer;
}
button:disabled { cursor: default; opacity: 0.55; }
</style>
