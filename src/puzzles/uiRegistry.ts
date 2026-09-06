import type { Component } from 'vue'
import QueensBoard from './queens/QueensBoard.vue'
import SudokuBoard from './sudoku/SudokuBoard.vue'

const boardsByPuzzleId: Readonly<Record<string, Component>> = {
  sudoku: SudokuBoard,
  queens: QueensBoard,
}

export function getPuzzleBoard(id: string): Component | undefined {
  return boardsByPuzzleId[id]
}
