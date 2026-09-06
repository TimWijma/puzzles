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
import {
  getNumericEntryIntent,
  resolveNumericEntryMode,
  useGridSelection,
  type NumericEntryMode,
} from '../shared/gridInput'
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
const puzzle = computed(() => generateSudoku({ seed: props.seed }))
const highlightedDigit = ref<SudokuDigit | null>(null)
const hintMode = ref(false)
const draggingSelection = ref(false)
const selection = useGridSelection(9, 9)

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
    selection.clear()
    highlightedDigit.value = null
    hintMode.value = false
    draggingSelection.value = false
    session.value = createSession()
  },
)

function isGiven(row: number, col: number): boolean {
  return puzzle.value.question.givens.cells[row]?.[col] !== null
}

function startPointerSelection(row: number, col: number, event: PointerEvent): void {
  if (event.button !== 0) return
  draggingSelection.value = true
  selection.select({ row, col }, event.ctrlKey || event.metaKey || event.shiftKey)
  highlightFullNumber(row, col)
  void nextTick(() => boardElement.value?.focus())
}

function extendPointerSelection(row: number, col: number, event: PointerEvent): void {
  if (!draggingSelection.value || (event.buttons & 1) === 0) {
    draggingSelection.value = false
    return
  }
  selection.select({ row, col }, true)
}

function stopPointerSelection(): void {
  draggingSelection.value = false
}

function persist(): void {
  saveSudokuProgress(localStorage, props.seed, playerState.value, solved.value)
}

function updateCompletion(
  next: GameSession<SudokuPlayerState, SudokuMove>,
): GameSession<SudokuPlayerState, SudokuMove> {
  return isSudokuSolved(puzzle.value, next.history.currentState)
    ? completeGame(next, Date.now())
    : next
}

function commit(move: SudokuMove): void {
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

function enterValue(value: SudokuDigit | null): void {
  if (selection.selectedPositions.value.length === 0 || solved.value) return
  commit({ kind: 'value', positions: selection.selectedPositions.value, value })
}

function enterHint(digit: SudokuDigit): void {
  if (selection.selectedPositions.value.length === 0 || solved.value) return
  const editableEmptyCells = selection.selectedPositions.value.filter(
    (position) =>
      !isGiven(position.row, position.col) && getCell(playerState.value.entries, position) === null,
  )
  const enabled = editableEmptyCells.some(
    (position) => !(getCell(playerState.value.hints, position) ?? []).includes(digit),
  )
  commit({ kind: 'hint', positions: editableEmptyCells, digit, enabled })
}

function enterFromPad(digit: number): void {
  enterDigit(digit as SudokuDigit, hintMode.value ? 'hint' : 'value')
}

function enterDigit(digit: SudokuDigit, requestedMode: NumericEntryMode): void {
  const mode = resolveNumericEntryMode(
    requestedMode,
    selection.selectedPositions.value.length,
  )
  if (mode === 'hint') {
    enterHint(digit)
  } else {
    enterValue(digit)
    highlightedDigit.value = digit
  }
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
  highlightedDigit.value = null
  hintMode.value = false
  clearSudokuProgress(localStorage, props.seed)
}

function selectMatchingFullNumbers(row: number, col: number): void {
  const value = getCell(board.value, { row, col })
  if (value === undefined || value === null) return
  highlightedDigit.value = value
  const matchingPositions = []
  for (let matchingRow = 0; matchingRow < 9; matchingRow += 1) {
    for (let matchingCol = 0; matchingCol < 9; matchingCol += 1) {
      if (board.value.cells[matchingRow]?.[matchingCol] === value) {
        matchingPositions.push({ row: matchingRow, col: matchingCol })
      }
    }
  }
  selection.selectMany(matchingPositions, { row, col })
}

function highlightFullNumber(row: number, col: number): void {
  const value = getCell(board.value, { row, col })
  if (value !== undefined && value !== null) highlightedDigit.value = value
}

function hintsAt(row: number, col: number): readonly SudokuDigit[] {
  return playerState.value.hints.cells[row]?.[col] ?? []
}

function cellContainsHighlightedDigit(row: number, col: number): boolean {
  return highlightedDigit.value !== null && board.value.cells[row]?.[col] === highlightedDigit.value
}

function cellContainsHighlightedHint(row: number, col: number): boolean {
  return highlightedDigit.value !== null && hintsAt(row, col).includes(highlightedDigit.value)
}

function isInActiveUnit(row: number, col: number): boolean {
  const active = selection.activePosition.value
  if (active === null || (active.row === row && active.col === col)) return false
  return (
    active.row === row ||
    active.col === col ||
    (Math.floor(active.row / 3) === Math.floor(row / 3) &&
      Math.floor(active.col / 3) === Math.floor(col / 3))
  )
}

function cellLabel(row: number, col: number): string {
  const value = board.value.cells[row]?.[col]
  if (value !== null && value !== undefined) return `Row ${row + 1}, column ${col + 1}, ${value}`
  const hints = hintsAt(row, col)
  return `Row ${row + 1}, column ${col + 1}${hints.length > 0 ? `, hints ${hints.join(', ')}` : ', empty'}`
}

function handleMovement(event: KeyboardEvent): boolean {
  const directions: Record<string, readonly [number, number]> = {
    arrowup: [-1, 0],
    w: [-1, 0],
    arrowright: [0, 1],
    d: [0, 1],
    arrowdown: [1, 0],
    s: [1, 0],
    arrowleft: [0, -1],
    a: [0, -1],
  }
  const direction = directions[event.key.toLowerCase()]
  if (direction === undefined) return false
  event.preventDefault()
  selection.move(
    direction[0],
    direction[1],
    event.shiftKey || event.ctrlKey || event.metaKey,
  )
  const active = selection.activePosition.value
  if (active !== null) highlightFullNumber(active.row, active.col)
  return true
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redoMove() : undoMove()
    return
  }
  if (handleMovement(event)) return

  const numericIntent = getNumericEntryIntent(event)
  if (numericIntent !== null) {
    event.preventDefault()
    enterDigit(numericIntent.value as SudokuDigit, numericIntent.mode)
    return
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    enterValue(null)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    selection.clear()
  }
}
</script>

<template>
  <div class="sudoku-game">
    <p class="seed">Seed: <code>{{ seed }}</code></p>
    <p v-if="solved" class="solved" role="status">Completed — nice work!</p>
    <p v-else class="instructions">
      Move with arrows or WASD. Click-drag, Ctrl/⌘, or Shift selects multiple cells.
      Digits enter values; Shift + digit—or any digit with multiple cells selected—toggles a hint.
      Double-click a full value to select every matching full value.
    </p>

    <div
      ref="boardElement"
      class="sudoku-board"
      role="grid"
      aria-label="Sudoku board"
      tabindex="0"
      @keydown="handleKeydown"
      @pointerup="stopPointerSelection"
      @pointercancel="stopPointerSelection"
      @pointerleave="stopPointerSelection"
    >
      <button
        v-for="(_, index) in 81"
        :key="index"
        type="button"
        role="gridcell"
        tabindex="-1"
        class="sudoku-cell"
        :class="{
          given: isGiven(Math.floor(index / 9), index % 9),
          entered: !isGiven(Math.floor(index / 9), index % 9) && board.cells[Math.floor(index / 9)]?.[index % 9] !== null,
          selected: selection.isSelected({ row: Math.floor(index / 9), col: index % 9 }),
          active: selection.activePosition.value?.row === Math.floor(index / 9) && selection.activePosition.value?.col === index % 9,
          related: isInActiveUnit(Math.floor(index / 9), index % 9),
          matching: cellContainsHighlightedDigit(Math.floor(index / 9), index % 9),
          'hint-matching': cellContainsHighlightedHint(Math.floor(index / 9), index % 9),
          'box-right': index % 9 === 2 || index % 9 === 5,
          'box-bottom': Math.floor(index / 9) === 2 || Math.floor(index / 9) === 5,
        }"
        :aria-label="cellLabel(Math.floor(index / 9), index % 9)"
        :aria-selected="selection.isSelected({ row: Math.floor(index / 9), col: index % 9 })"
        @pointerdown="startPointerSelection(Math.floor(index / 9), index % 9, $event)"
        @pointerenter="extendPointerSelection(Math.floor(index / 9), index % 9, $event)"
        @dragstart.prevent
        @dblclick.stop.prevent="selectMatchingFullNumbers(Math.floor(index / 9), index % 9)"
      >
        <span v-if="board.cells[Math.floor(index / 9)]?.[index % 9]" class="cell-value">
          {{ board.cells[Math.floor(index / 9)]?.[index % 9] }}
        </span>
        <span v-else class="cell-hints" aria-hidden="true">
          <span
            v-for="digit in 9"
            :key="digit"
            :class="{
              visible: hintsAt(Math.floor(index / 9), index % 9).includes(digit as SudokuDigit),
              highlighted: highlightedDigit === digit && hintsAt(Math.floor(index / 9), index % 9).includes(digit as SudokuDigit),
            }"
          >
            {{ hintsAt(Math.floor(index / 9), index % 9).includes(digit as SudokuDigit) ? digit : '' }}
          </span>
        </span>
      </button>
    </div>

    <div class="number-pad" aria-label="Digit controls">
      <button v-for="digit in 9" :key="digit" type="button" @click="enterFromPad(digit)">
        {{ digit }}
      </button>
      <button
        type="button"
        class="hint-toggle"
        :class="{ active: hintMode }"
        :aria-pressed="hintMode"
        @click="hintMode = !hintMode"
      >
        Hints
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
.sudoku-game { max-width: 36rem; }
.seed, .instructions { color: #68758a; }
.solved { color: #23723c; font-weight: 700; }
.sudoku-board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, minmax(0, 1fr));
  width: min(100%, 33rem);
  aspect-ratio: 1;
  border: 2px solid #172033;
  outline-offset: 0.3rem;
  overflow: hidden;
  user-select: none;
}
.sudoku-cell {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-right: 1px solid #aeb6c3;
  border-bottom: 1px solid #aeb6c3;
  border-radius: 0;
  color: #315c9a;
  background: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.sudoku-cell:nth-child(9n) { border-right: 0; }
.sudoku-cell:nth-last-child(-n + 9) { border-bottom: 0; }
.sudoku-cell.box-right { border-right: 2px solid #172033; }
.sudoku-cell.box-bottom { border-bottom: 2px solid #172033; }
.sudoku-cell.given { color: #172033; background: #f0f2f5; }
.sudoku-cell.related { background: #fff9e8; }
.sudoku-cell.matching { background: #fff0ad; }
.sudoku-cell.hint-matching { background: #fff8d8; }
.sudoku-cell.selected { background: #dbe9ff; box-shadow: inset 0 0 0 2px #6c91c7; }
.sudoku-cell.active { box-shadow: inset 0 0 0 3px #244f8d; z-index: 1; }
.sudoku-cell:hover::after {
  position: absolute;
  z-index: 2;
  inset: 0;
  background: rgba(23, 32, 51, 0.1);
  content: '';
  pointer-events: none;
}
.cell-value {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  font-size: clamp(1rem, 5vw, 1.6rem);
}
.cell-hints {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 100%;
  height: 100%;
  padding: 0.08rem;
  color: #526a91;
  font-size: clamp(0.42rem, 1.7vw, 0.68rem);
  line-height: 1;
}
.cell-hints > span { display: grid; min-width: 0; min-height: 0; place-items: center; border-radius: 50%; }
.cell-hints > span:not(.visible) { pointer-events: none; }
.cell-hints > span.highlighted { color: #172033; background: #ffd84f; font-weight: 800; }
.number-pad, .game-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
.number-pad button, .game-actions button {
  min-width: 2.5rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid #b8c0cc;
  border-radius: 0.35rem;
  background: #fff;
  cursor: pointer;
}
.number-pad .hint-toggle.active { color: #fff; border-color: #315c9a; background: #315c9a; }
button:disabled { cursor: default; opacity: 0.55; }
</style>
