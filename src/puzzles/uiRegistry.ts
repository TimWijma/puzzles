import type { Component } from 'vue'
import SudokuBoard from './sudoku/SudokuBoard.vue'

const boardsByPuzzleId: Readonly<Record<string, Component>> = {
  sudoku: SudokuBoard,
}

export function getPuzzleBoard(id: string): Component | undefined {
  return boardsByPuzzleId[id]
}

