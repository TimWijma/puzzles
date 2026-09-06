export interface MoveRecord<TState, TMove> {
  readonly move: TMove
  readonly before: TState
  readonly after: TState
}

export interface MoveHistory<TState, TMove> {
  readonly initialState: TState
  readonly currentState: TState
  readonly past: readonly MoveRecord<TState, TMove>[]
  readonly future: readonly MoveRecord<TState, TMove>[]
}

export type MoveReducer<TState, TMove> = (state: TState, move: TMove) => TState

export function createMoveHistory<TState, TMove>(initialState: TState): MoveHistory<TState, TMove> {
  return { initialState, currentState: initialState, past: [], future: [] }
}

export function applyMove<TState, TMove>(
  history: MoveHistory<TState, TMove>,
  move: TMove,
  reduce: MoveReducer<TState, TMove>,
): MoveHistory<TState, TMove> {
  const after = reduce(history.currentState, move)
  const record: MoveRecord<TState, TMove> = {
    move,
    before: history.currentState,
    after,
  }

  return {
    ...history,
    currentState: after,
    past: [...history.past, record],
    future: [],
  }
}

export function undo<TState, TMove>(history: MoveHistory<TState, TMove>): MoveHistory<TState, TMove> {
  const record = history.past.at(-1)
  if (record === undefined) {
    return history
  }

  return {
    ...history,
    currentState: record.before,
    past: history.past.slice(0, -1),
    future: [record, ...history.future],
  }
}

export function redo<TState, TMove>(history: MoveHistory<TState, TMove>): MoveHistory<TState, TMove> {
  const [record, ...remainingFuture] = history.future
  if (record === undefined) {
    return history
  }

  return {
    ...history,
    currentState: record.after,
    past: [...history.past, record],
    future: remainingFuture,
  }
}

export function resetHistory<TState, TMove>(
  history: MoveHistory<TState, TMove>,
): MoveHistory<TState, TMove> {
  return {
    initialState: history.initialState,
    currentState: history.initialState,
    past: [],
    future: [],
  }
}

export function canUndo<TState, TMove>(history: MoveHistory<TState, TMove>): boolean {
  return history.past.length > 0
}

export function canRedo<TState, TMove>(history: MoveHistory<TState, TMove>): boolean {
  return history.future.length > 0
}
