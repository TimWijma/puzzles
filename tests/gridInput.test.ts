import { describe, expect, it } from 'vitest'
import {
  getNumericEntryIntent,
  resolveNumericEntryMode,
  useGridSelection,
} from '../src/puzzles/shared/gridInput'

function keyboardEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    altKey: false,
    code: '',
    ctrlKey: false,
    key: '',
    metaKey: false,
    shiftKey: false,
    ...overrides,
  } as KeyboardEvent
}

describe('shared grid input', () => {
  it('maps number keys to values and Shift+number to hints', () => {
    expect(getNumericEntryIntent(keyboardEvent({ key: '4', code: 'Digit4' }))).toEqual({
      value: 4,
      mode: 'value',
    })
    expect(
      getNumericEntryIntent(keyboardEvent({ key: '$', code: 'Digit4', shiftKey: true })),
    ).toEqual({ value: 4, mode: 'hint' })
  })

  it('ignores non-numeric and command-modified input', () => {
    expect(getNumericEntryIntent(keyboardEvent({ key: 'w', code: 'KeyW' }))).toBeNull()
    expect(
      getNumericEntryIntent(keyboardEvent({ key: '4', code: 'Digit4', ctrlKey: true })),
    ).toBeNull()
  })

  it('uses hint mode automatically when multiple cells are selected', () => {
    expect(resolveNumericEntryMode('value', 1)).toBe('value')
    expect(resolveNumericEntryMode('value', 2)).toBe('hint')
    expect(resolveNumericEntryMode('hint', 1)).toBe('hint')
  })

  it('supports replacement, additive selection, and movement', () => {
    const selection = useGridSelection(3, 3)
    selection.select({ row: 1, col: 1 })
    selection.move(0, 1, true)
    expect(selection.selectedPositions.value).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ])
    selection.move(1, 0)
    expect(selection.selectedPositions.value).toEqual([{ row: 2, col: 2 }])
    selection.selectMany([{ row: 0, col: 0 }, { row: 2, col: 1 }], { row: 2, col: 1 })
    expect(selection.selectedPositions.value).toEqual([
      { row: 0, col: 0 },
      { row: 2, col: 1 },
    ])
    selection.clear()
    expect(selection.selectedPositions.value).toEqual([])
  })
})
