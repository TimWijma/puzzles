import type { Component } from 'vue'
import QueensBoard from './queens/QueensBoard.vue'
import SudokuBoard from './sudoku/SudokuBoard.vue'
import SuguruBoard from './suguru/SuguruBoard.vue'

const boardsByPuzzleId: Readonly<Record<string, Component>> = {
  sudoku: SudokuBoard,
  queens: QueensBoard,
  suguru: SuguruBoard,
}

export function getPuzzleBoard(id: string): Component | undefined {
  return boardsByPuzzleId[id]
}
