import { describe, expect, it } from 'vitest'
import {
  applyGameMove,
  applyMove,
  completeGame,
  createGameSession,
  createMoveHistory,
  getElapsedMilliseconds,
  redo,
  resetGame,
  resetHistory,
  undo,
} from '../src/core/game'

type CounterMove = { readonly amount: number }
const add = (state: number, move: CounterMove): number => state + move.amount

describe('move history', () => {
  it('applies state changes and supports undo and redo', () => {
    let history = createMoveHistory<number, CounterMove>(0)
    history = applyMove(history, { amount: 2 }, add)
    history = applyMove(history, { amount: 3 }, add)
    expect(history.currentState).toBe(5)
    history = undo(history)
    expect(history.currentState).toBe(2)
    history = undo(history)
    expect(history.currentState).toBe(0)
    history = redo(history)
    expect(history.currentState).toBe(2)
    history = redo(history)
    expect(history.currentState).toBe(5)
  })

  it('clears redo history when a new move follows undo', () => {
    let history = createMoveHistory<number, CounterMove>(0)
    history = applyMove(history, { amount: 2 }, add)
    history = applyMove(history, { amount: 3 }, add)
    history = undo(history)
    expect(history.future).toHaveLength(1)
    history = applyMove(history, { amount: 10 }, add)
    expect(history.currentState).toBe(12)
    expect(history.future).toEqual([])
  })

  it('resets current state and both history stacks', () => {
    let history = createMoveHistory<number, CounterMove>(4)
    history = applyMove(history, { amount: 5 }, add)
    history = undo(history)
    history = resetHistory(history)
    expect(history.currentState).toBe(4)
    expect(history.past).toEqual([])
    expect(history.future).toEqual([])
  })

  it('resets the wider game session, including completion and elapsed time', () => {
    const session = createGameSession<number, CounterMove>(7)
    const reset = resetGame({
      ...session,
      completion: 'completed',
      elapsedTime: { accumulatedMs: 1_500, runningSinceMs: null },
    })
    expect(reset.history.currentState).toBe(7)
    expect(reset.completion).toBe('not-started')
    expect(reset.elapsedTime).toEqual({ accumulatedMs: 0, runningSinceMs: null })
  })

  it('tracks elapsed time while a game is active and stops on completion', () => {
    let session = createGameSession<number, CounterMove>(0)
    session = applyGameMove(session, { amount: 1 }, add, 1_000)
    expect(session.completion).toBe('in-progress')
    expect(getElapsedMilliseconds(session.elapsedTime, 1_750)).toBe(750)

    session = completeGame(session, 2_000)
    expect(session.completion).toBe('completed')
    expect(getElapsedMilliseconds(session.elapsedTime, 5_000)).toBe(1_000)
  })
})
