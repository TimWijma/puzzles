import { computed, ref, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { getCell, type Grid, type Position } from '../../core/grid'

export type NumericEntryMode = 'value' | 'hint'

export interface NumericEntryIntent {
  readonly value: number
  readonly mode: NumericEntryMode
}

export function resolveNumericEntryMode(
  requestedMode: NumericEntryMode,
  selectedCellCount: number,
): NumericEntryMode {
  return requestedMode === 'hint' || selectedCellCount > 1 ? 'hint' : 'value'
}

/** Converts a digit key into a reusable value-or-hint intent. */
export function getNumericEntryIntent(
  event: Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
  minimum = 1,
  maximum = 9,
): NumericEntryIntent | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null
  const codeMatch = /^(?:Digit|Numpad)(\d)$/.exec(event.code)
  const character = codeMatch?.[1] ?? (/^\d$/.test(event.key) ? event.key : null)
  if (character === null) return null
  const value = Number(character)
  if (value < minimum || value > maximum) return null
  return { value, mode: event.shiftKey ? 'hint' : 'value' }
}

function positionKey(position: Position): string {
  return `${position.row}:${position.col}`
}

function positionFromKey(key: string): Position {
  const [row, col] = key.split(':').map(Number)
  return { row: row as number, col: col as number }
}

export function useGridSelection(
  rowCount: MaybeRefOrGetter<number>,
  columnCount: MaybeRefOrGetter<number>,
  canSelect: (position: Position) => boolean = () => true,
) {
  const selectedKeys = shallowRef<ReadonlySet<string>>(new Set())
  const activePosition = shallowRef<Position | null>(null)
  const selectedPositions = computed(() => [...selectedKeys.value].map(positionFromKey))

  const isInBounds = (position: Position): boolean =>
    position.row >= 0 &&
    position.row < toValue(rowCount) &&
    position.col >= 0 &&
    position.col < toValue(columnCount)

  const select = (position: Position, additive = false): void => {
    if (!isInBounds(position) || !canSelect(position)) return
    const key = positionKey(position)
    selectedKeys.value = additive
      ? new Set([...selectedKeys.value, key])
      : new Set([key])
    activePosition.value = position
  }

  const selectMany = (positions: readonly Position[], active?: Position): void => {
    const selectable = positions.filter((position) => isInBounds(position) && canSelect(position))
    selectedKeys.value = new Set(selectable.map(positionKey))
    const requestedActive = active === undefined ? undefined : positionKey(active)
    activePosition.value =
      requestedActive !== undefined && selectedKeys.value.has(requestedActive)
        ? active as Position
        : selectable[0] ?? null
  }

  const firstSelectablePosition = (): Position | null => {
    for (let row = 0; row < toValue(rowCount); row += 1) {
      for (let col = 0; col < toValue(columnCount); col += 1) {
        if (canSelect({ row, col })) return { row, col }
      }
    }
    return null
  }

  const move = (rowDelta: number, colDelta: number, additive = false): void => {
    if (activePosition.value === null) {
      const first = firstSelectablePosition()
      if (first !== null) select(first, additive)
      return
    }

    let candidate = {
      row: activePosition.value.row + rowDelta,
      col: activePosition.value.col + colDelta,
    }
    while (isInBounds(candidate)) {
      if (canSelect(candidate)) {
        select(candidate, additive)
        return
      }
      candidate = { row: candidate.row + rowDelta, col: candidate.col + colDelta }
    }
  }

  const clear = (): void => {
    selectedKeys.value = new Set()
    activePosition.value = null
  }

  const isSelected = (position: Position): boolean => selectedKeys.value.has(positionKey(position))

  return { activePosition, clear, isSelected, move, select, selectMany, selectedPositions }
}

export interface NumericGridInteractionOptions {
  readonly rowCount: MaybeRefOrGetter<number>
  readonly columnCount: MaybeRefOrGetter<number>
  readonly board: MaybeRefOrGetter<Grid<number | null>>
  readonly hints: MaybeRefOrGetter<Grid<readonly number[]>>
}

/** Shared selection, hint-mode, and matching-number behaviour for numeric puzzle boards. */
export function useNumericGridInteraction(options: NumericGridInteractionOptions) {
  const selection = useGridSelection(options.rowCount, options.columnCount)
  const highlightedValue = ref<number | null>(null)
  const hintMode = ref(false)
  const draggingSelection = ref(false)

  // Keep matching highlights tied to what is actively selected, including keyboard movement,
  // additive selection, pointer dragging, value entry, undo, and redo.
  watch(
    () => ({
      position: selection.activePosition.value,
      board: toValue(options.board),
    }),
    ({ position, board }) => {
      highlightedValue.value = position === null ? null : (getCell(board, position) ?? null)
    },
    { immediate: true },
  )

  const hintsAt = (position: Position): readonly number[] =>
    getCell(toValue(options.hints), position) ?? []

  const highlightFullNumber = (position: Position): void => {
    const value = getCell(toValue(options.board), position)
    if (value !== undefined && value !== null) highlightedValue.value = value
  }

  const startPointerSelection = (position: Position, event: PointerEvent): boolean => {
    if (event.button !== 0) return false
    draggingSelection.value = true
    selection.select(position, event.ctrlKey || event.metaKey || event.shiftKey)
    highlightFullNumber(position)
    return true
  }

  const extendPointerSelection = (position: Position, event: PointerEvent): void => {
    if (!draggingSelection.value || (event.buttons & 1) === 0) {
      draggingSelection.value = false
      return
    }
    selection.select(position, true)
  }

  const stopPointerSelection = (): void => {
    draggingSelection.value = false
  }

  const selectMatchingFullNumbers = (position: Position): void => {
    const board = toValue(options.board)
    const value = getCell(board, position)
    if (value === undefined || value === null) return
    highlightedValue.value = value
    const matches: Position[] = []
    for (let row = 0; row < board.rowCount; row += 1) {
      for (let col = 0; col < board.columnCount; col += 1) {
        if (board.cells[row]?.[col] === value) matches.push({ row, col })
      }
    }
    selection.selectMany(matches, position)
  }

  const cellContainsHighlightedValue = (position: Position): boolean =>
    highlightedValue.value !== null &&
    getCell(toValue(options.board), position) === highlightedValue.value

  const cellContainsHighlightedHint = (position: Position): boolean =>
    highlightedValue.value !== null && hintsAt(position).includes(highlightedValue.value)

  const handleMovement = (event: KeyboardEvent): boolean => {
    const directions: Record<string, readonly [number, number]> = {
      arrowup: [-1, 0], w: [-1, 0],
      arrowright: [0, 1], d: [0, 1],
      arrowdown: [1, 0], s: [1, 0],
      arrowleft: [0, -1], a: [0, -1],
    }
    const direction = directions[event.key.toLowerCase()]
    if (direction === undefined) return false
    event.preventDefault()
    selection.move(direction[0], direction[1], event.shiftKey || event.ctrlKey || event.metaKey)
    const active = selection.activePosition.value
    if (active !== null) highlightFullNumber(active)
    return true
  }

  const resetInteraction = (): void => {
    selection.clear()
    highlightedValue.value = null
    hintMode.value = false
    draggingSelection.value = false
  }

  return {
    cellContainsHighlightedHint,
    cellContainsHighlightedValue,
    extendPointerSelection,
    handleMovement,
    highlightFullNumber,
    highlightedValue,
    hintMode,
    hintsAt,
    resetInteraction,
    selectMatchingFullNumbers,
    selection,
    startPointerSelection,
    stopPointerSelection,
  }
}
