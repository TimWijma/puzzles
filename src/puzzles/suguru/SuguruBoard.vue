<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch, type CSSProperties } from 'vue'
import {
  applyGameMove, canRedo, canUndo, completeGame, createGameSession, redoGameMove,
  resetGame, undoGameMove, type GameSession,
} from '../../core/game'
import { getCell } from '../../core/grid'
import {
  findIncorrectFilledPositions,
  positionKey,
  positionKeySet,
} from '../shared/boardCheck'
import {
  getNumericEntryIntent, resolveNumericEntryMode, useNumericGridInteraction,
  type NumericEntryMode,
} from '../shared/gridInput'
import { generateSuguru } from './generator'
import { clearSuguruProgress, loadSuguruProgress, saveSuguruProgress } from './persistence'
import { regionSize } from './regions'
import { applySuguruMove, createInitialSuguruState, mergeSuguruBoard } from './state'
import { solve as solveSuguru } from './solver'
import type { SuguruMove, SuguruPlayerState } from './types'
import { isSuguruCellConflicting, isSuguruSolved } from './validator'

const props = defineProps<{ seed: string }>()
const boardElement = ref<HTMLElement | null>(null)
const puzzle = computed(() => generateSuguru({ seed: props.seed }))
const rowCount = computed(() => puzzle.value.question.regions.rowCount)
const columnCount = computed(() => puzzle.value.question.regions.columnCount)

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
const solution = computed(() => solveSuguru(puzzle.value))
const checkPerformed = ref(false)
const incorrectEntryKeys = shallowRef<ReadonlySet<string>>(new Set())
const {
  cellContainsHighlightedHint, extendPointerSelection,
  handleMovement, highlightedValue, hintMode, hintsAt, resetInteraction,
  selectMatchingFullNumbers, selection, startPointerSelection, stopPointerSelection,
} = useNumericGridInteraction({
  rowCount,
  columnCount,
  board,
  hints: computed(() => state.value.hints),
})
const solved = computed(() => session.value.completion === 'completed')
const undoAvailable = computed(() => canUndo(session.value.history))
const redoAvailable = computed(() => canRedo(session.value.history))
const checkMessage = computed(() => {
  if (!checkPerformed.value) return ''
  const count = incorrectEntryKeys.value.size
  return count === 0
    ? 'Everything entered so far is correct.'
    : `${count} ${count === 1 ? 'entry is' : 'entries are'} incorrect.`
})
const selectedValue = computed(() => {
  const active = selection.activePosition.value
  return active === null ? null : (getCell(board.value, active) ?? null)
})
const selectedMaximum = computed(() => {
  const active = selection.activePosition.value
  return active === null ? 0 : maximumAt(active.row, active.col)
})

watch(() => props.seed, () => {
  resetInteraction()
  clearCheckResult()
  session.value = createSession()
})

function maximumAt(row: number, col: number): number {
  const regionId = getCell(puzzle.value.question.regions, { row, col })
  return regionId === undefined ? 0 : regionSize(puzzle.value.question.regions, regionId)
}

function isGiven(row: number, col: number): boolean {
  return puzzle.value.question.givens.cells[row]?.[col] !== null
}

function startCellSelection(row: number, col: number, event: PointerEvent): void {
  if (startPointerSelection({ row, col }, event)) {
    void nextTick(() => boardElement.value?.focus())
  }
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
  clearCheckResult()
  session.value = updateCompletion(applyGameMove(
    session.value,
    move,
    (current, currentMove) => applySuguruMove(puzzle.value, current, currentMove),
    Date.now(),
  ))
  persist()
}

function enterValue(value: number | null): void {
  if (selection.selectedPositions.value.length === 0 || solved.value) return
  commit({ kind: 'value', positions: selection.selectedPositions.value, value })
}

function enterHint(digit: number): void {
  if (selection.selectedPositions.value.length === 0 || solved.value) return
  const editableEmptyCells = selection.selectedPositions.value.filter(
    (position) =>
      !isGiven(position.row, position.col) &&
      getCell(state.value.entries, position) === null &&
      digit <= maximumAt(position.row, position.col),
  )
  const enabled = editableEmptyCells.some((position) => !hintsAt(position).includes(digit))
  commit({ kind: 'hint', positions: editableEmptyCells, digit, enabled })
}

function enterDigit(digit: number, requestedMode: NumericEntryMode): void {
  const mode = resolveNumericEntryMode(requestedMode, selection.selectedPositions.value.length)
  if (mode === 'hint') enterHint(digit)
  else {
    enterValue(digit)
    highlightedValue.value = digit
  }
}

function enterFromPad(digit: number): void {
  enterDigit(digit, hintMode.value ? 'hint' : 'value')
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
  resetInteraction()
  clearCheckResult()
  clearSuguruProgress(localStorage, props.seed)
}

function clearCheckResult(): void {
  checkPerformed.value = false
  incorrectEntryKeys.value = new Set()
}

function checkBoard(): void {
  const answer = solution.value
  if (answer === null) return
  incorrectEntryKeys.value = positionKeySet(findIncorrectFilledPositions(
    state.value.entries,
    answer,
    (value) => value !== null,
    (value, expected) => value === expected,
  ))
  checkPerformed.value = true
}

function isIncorrect(row: number, col: number): boolean {
  return incorrectEntryKeys.value.has(positionKey({ row, col }))
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? redoMove() : undoMove()
    return
  }
  if (handleMovement(event)) return
  const numericIntent = getNumericEntryIntent(event, 1, selectedMaximum.value)
  if (numericIntent !== null) {
    event.preventDefault()
    enterDigit(numericIntent.value, numericIntent.mode)
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
    borderRight: col === columnCount.value - 1 || regions[row]?.[col + 1] !== regionId ? edge : inner,
    borderBottom: row === rowCount.value - 1 || regions[row + 1]?.[col] !== regionId ? edge : inner,
    borderLeft: col === 0 || regions[row]?.[col - 1] !== regionId ? edge : inner,
  }
}

function isConflicting(row: number, col: number): boolean {
  return isSuguruCellConflicting(puzzle.value, state.value, { row, col })
}

function hasSelectedValue(row: number, col: number): boolean {
  return selectedValue.value !== null && board.value.cells[row]?.[col] === selectedValue.value
}

function cellLabel(row: number, col: number): string {
  const value = board.value.cells[row]?.[col]
  if (value !== null && value !== undefined) {
    return `Row ${row + 1}, column ${col + 1}, ${value}, region values 1 to ${maximumAt(row, col)}`
  }
  const hints = hintsAt({ row, col })
  return `Row ${row + 1}, column ${col + 1}${hints.length > 0 ? `, hints ${hints.join(', ')}` : ', empty'}, region values 1 to ${maximumAt(row, col)}`
}
</script>

<template>
  <div class="numeric-grid-game suguru-game">
    <p class="seed">Seed: <code>{{ seed }}</code></p>
    <p v-if="solved" class="solved" role="status">Completed — nice work!</p>
    <p v-else class="instructions">
      Fill each region with 1 through its size. Equal numbers cannot touch, including diagonally.
      Click-drag, Ctrl/⌘, or Shift selects multiple cells. Shift + number adds hints.
    </p>
    <p
      v-if="checkPerformed"
      class="board-check-message"
      :class="incorrectEntryKeys.size === 0 ? 'correct' : 'incorrect-message'"
      role="status"
    >{{ checkMessage }}</p>

    <div
      ref="boardElement"
      class="numeric-grid-board suguru-board"
      role="grid"
      aria-label="Suguru board"
      tabindex="0"
      :style="{
        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
        gridTemplateRows: `repeat(${rowCount}, 1fr)`,
        aspectRatio: `${columnCount} / ${rowCount}`,
      }"
      @keydown="handleKeydown"
      @pointerup="stopPointerSelection"
      @pointercancel="stopPointerSelection"
      @pointerleave="stopPointerSelection"
    >
      <button
        v-for="(_, index) in rowCount * columnCount"
        :key="index"
        type="button"
        role="gridcell"
        tabindex="-1"
        class="numeric-grid-cell suguru-cell"
        :class="{
          given: isGiven(Math.floor(index / columnCount), index % columnCount),
          entered: !isGiven(Math.floor(index / columnCount), index % columnCount) && board.cells[Math.floor(index / columnCount)]?.[index % columnCount] !== null,
          selected: selection.isSelected({ row: Math.floor(index / columnCount), col: index % columnCount }),
          active: selection.activePosition.value?.row === Math.floor(index / columnCount) && selection.activePosition.value?.col === index % columnCount,
          'same-value': hasSelectedValue(Math.floor(index / columnCount), index % columnCount),
          'hint-matching': cellContainsHighlightedHint({ row: Math.floor(index / columnCount), col: index % columnCount }),
          conflict: isConflicting(Math.floor(index / columnCount), index % columnCount),
          incorrect: isIncorrect(Math.floor(index / columnCount), index % columnCount),
        }"
        :style="cellStyle(Math.floor(index / columnCount), index % columnCount)"
        :aria-label="cellLabel(Math.floor(index / columnCount), index % columnCount)"
        :aria-selected="selection.isSelected({ row: Math.floor(index / columnCount), col: index % columnCount })"
        @pointerdown="startCellSelection(Math.floor(index / columnCount), index % columnCount, $event)"
        @pointerenter="extendPointerSelection({ row: Math.floor(index / columnCount), col: index % columnCount }, $event)"
        @dragstart.prevent
        @dblclick.stop.prevent="selectMatchingFullNumbers({ row: Math.floor(index / columnCount), col: index % columnCount })"
      >
        <span v-if="board.cells[Math.floor(index / columnCount)]?.[index % columnCount]" class="cell-value">
          {{ board.cells[Math.floor(index / columnCount)]?.[index % columnCount] }}
        </span>
        <span v-else class="cell-hints" aria-hidden="true">
          <span
            v-for="digit in maximumAt(Math.floor(index / columnCount), index % columnCount)"
            :key="digit"
            :class="{
              visible: hintsAt({ row: Math.floor(index / columnCount), col: index % columnCount }).includes(digit),
              highlighted: selectedValue === digit && hintsAt({ row: Math.floor(index / columnCount), col: index % columnCount }).includes(digit),
            }"
          >
            {{ hintsAt({ row: Math.floor(index / columnCount), col: index % columnCount }).includes(digit) ? digit : '' }}
          </span>
        </span>
      </button>
    </div>

    <div class="number-pad" aria-label="Number controls">
      <template v-if="selectedMaximum > 0">
        <button v-for="value in selectedMaximum" :key="value" type="button" @click="enterFromPad(value)">
          {{ value }}
        </button>
      </template>
      <span v-else class="select-prompt">Select a cell to see its region's values.</span>
      <button
        type="button"
        class="hint-toggle"
        :class="{ active: hintMode }"
        :aria-pressed="hintMode"
        @click="hintMode = !hintMode"
      >Hints</button>
      <button type="button" :disabled="selection.activePosition.value === null" @click="enterValue(null)">
        Clear
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
.suguru-game { max-width: 34rem; }
.suguru-board { width: min(100%, 31rem); }
.suguru-cell.same-value:not(.selected) {
  background: #fff0ad;
  box-shadow: inset 0 0 0 2px #e1b934;
}
.suguru-cell.conflict { color: #a52f2f; background: #ffe5e5; }
.suguru-cell.selected.conflict { box-shadow: inset 0 0 0 3px #a52f2f; }
.suguru-cell.incorrect { color: #a52f2f; background: #ffe1e1; }
</style>
