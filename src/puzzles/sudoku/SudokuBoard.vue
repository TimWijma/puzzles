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
  findIncorrectFilledPositions,
  positionKey,
  positionKeySet,
} from '../shared/boardCheck'
import {
  getNumericEntryIntent,
  resolveNumericEntryMode,
  useNumericGridInteraction,
  type NumericEntryMode,
} from '../shared/gridInput'
import { generateSudoku } from './generator'
import {
  clearSudokuProgress,
  loadSudokuProgress,
  saveSudokuProgress,
} from './persistence'
import { applySudokuMove, createInitialSudokuState, mergeSudokuBoard } from './state'
import { solve as solveSudoku } from './solver'
import type { SudokuDigit, SudokuMove, SudokuPlayerState } from './types'
import { isSudokuSolved } from './validator'

const props = defineProps<{ seed: string }>()
const boardElement = ref<HTMLElement | null>(null)
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
const solution = computed(() => solveSudoku(puzzle.value))
const checkPerformed = ref(false)
const incorrectEntryKeys = shallowRef<ReadonlySet<string>>(new Set())
const interaction = useNumericGridInteraction({
  rowCount: 9,
  columnCount: 9,
  board,
  hints: computed(() => playerState.value.hints),
})
const selection = interaction.selection
const highlightedDigit = interaction.highlightedValue
const hintMode = interaction.hintMode
const undoAvailable = computed(() => canUndo(session.value.history))
const redoAvailable = computed(() => canRedo(session.value.history))
const solved = computed(() => session.value.completion === 'completed')
const checkMessage = computed(() => {
  if (!checkPerformed.value) return ''
  const count = incorrectEntryKeys.value.size
  return count === 0
    ? 'Everything entered so far is correct.'
    : `${count} ${count === 1 ? 'entry is' : 'entries are'} incorrect.`
})

watch(
  () => props.seed,
  () => {
    interaction.resetInteraction()
    clearCheckResult()
    session.value = createSession()
  },
)

function isGiven(row: number, col: number): boolean {
  return puzzle.value.question.givens.cells[row]?.[col] !== null
}

function startPointerSelection(row: number, col: number, event: PointerEvent): void {
  if (event.button !== 0) return
  if (interaction.startPointerSelection({ row, col }, event)) {
    void nextTick(() => boardElement.value?.focus())
  }
}

function extendPointerSelection(row: number, col: number, event: PointerEvent): void {
  interaction.extendPointerSelection({ row, col }, event)
}

function stopPointerSelection(): void {
  interaction.stopPointerSelection()
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
  clearCheckResult()

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
  clearCheckResult()
  session.value = updateCompletion(undoGameMove(session.value, Date.now()))
  persist()
}

function redoMove(): void {
  clearCheckResult()
  session.value = updateCompletion(redoGameMove(session.value, Date.now()))
  persist()
}

function resetPuzzle(): void {
  session.value = resetGame(session.value)
  interaction.resetInteraction()
  clearCheckResult()
  clearSudokuProgress(localStorage, props.seed)
}

function clearCheckResult(): void {
  checkPerformed.value = false
  incorrectEntryKeys.value = new Set()
}

function checkBoard(): void {
  const answer = solution.value
  if (answer === null) return
  incorrectEntryKeys.value = positionKeySet(findIncorrectFilledPositions(
    playerState.value.entries,
    answer,
    (value) => value !== null,
    (value, expected) => value === expected,
  ))
  checkPerformed.value = true
}

function isIncorrect(row: number, col: number): boolean {
  return incorrectEntryKeys.value.has(positionKey({ row, col }))
}

function selectMatchingFullNumbers(row: number, col: number): void {
  interaction.selectMatchingFullNumbers({ row, col })
}

function hintsAt(row: number, col: number): readonly SudokuDigit[] {
  return interaction.hintsAt({ row, col }) as readonly SudokuDigit[]
}

function cellContainsHighlightedDigit(row: number, col: number): boolean {
  return interaction.cellContainsHighlightedValue({ row, col })
}

function cellContainsHighlightedHint(row: number, col: number): boolean {
  return interaction.cellContainsHighlightedHint({ row, col })
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
  return interaction.handleMovement(event)
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
  <div class="numeric-grid-game sudoku-game">
    <p class="seed">Seed: <code>{{ seed }}</code></p>
    <p v-if="solved" class="solved" role="status">Completed — nice work!</p>
    <p v-else class="instructions">
      Move with arrows or WASD. Click-drag, Ctrl/⌘, or Shift selects multiple cells.
      Digits enter values; Shift + digit—or any digit with multiple cells selected—toggles a hint.
      Double-click a full value to select every matching full value.
    </p>
    <p
      v-if="checkPerformed"
      class="board-check-message"
      :class="incorrectEntryKeys.size === 0 ? 'correct' : 'incorrect-message'"
      role="status"
    >{{ checkMessage }}</p>

    <div
      ref="boardElement"
      class="numeric-grid-board sudoku-board"
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
        class="numeric-grid-cell sudoku-cell"
        :class="{
          given: isGiven(Math.floor(index / 9), index % 9),
          entered: !isGiven(Math.floor(index / 9), index % 9) && board.cells[Math.floor(index / 9)]?.[index % 9] !== null,
          selected: selection.isSelected({ row: Math.floor(index / 9), col: index % 9 }),
          active: selection.activePosition.value?.row === Math.floor(index / 9) && selection.activePosition.value?.col === index % 9,
          related: isInActiveUnit(Math.floor(index / 9), index % 9),
          matching: cellContainsHighlightedDigit(Math.floor(index / 9), index % 9),
          'hint-matching': cellContainsHighlightedHint(Math.floor(index / 9), index % 9),
          incorrect: isIncorrect(Math.floor(index / 9), index % 9),
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
      <button type="button" @click="checkBoard">Check</button>
      <button type="button" :disabled="!undoAvailable" @click="undoMove">Undo</button>
      <button type="button" :disabled="!redoAvailable" @click="redoMove">Redo</button>
      <button type="button" @click="resetPuzzle">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.sudoku-game { max-width: 36rem; }
.sudoku-board {
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, minmax(0, 1fr));
  width: min(100%, 33rem);
  aspect-ratio: 1;
  border: 2px solid #172033;
  overflow: hidden;
}
.sudoku-cell {
  border: 0;
  border-right: 1px solid #aeb6c3;
  border-bottom: 1px solid #aeb6c3;
}
.sudoku-cell:nth-child(9n) { border-right: 0; }
.sudoku-cell:nth-last-child(-n + 9) { border-bottom: 0; }
.sudoku-cell.box-right { border-right: 2px solid #172033; }
.sudoku-cell.box-bottom { border-bottom: 2px solid #172033; }
</style>
