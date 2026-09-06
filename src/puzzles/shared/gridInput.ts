import { computed, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import type { Position } from '../../core/grid'

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
