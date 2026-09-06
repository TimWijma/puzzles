import {
  applyMove,
  createMoveHistory,
  redo,
  resetHistory,
  undo,
  type MoveHistory,
  type MoveReducer,
} from './history'
import {
  createElapsedTime,
  pauseElapsedTime,
  startElapsedTime,
  type ElapsedTime,
} from './elapsedTime'

export type CompletionState = 'not-started' | 'in-progress' | 'completed'

export interface GameSession<TPlayerState, TMove> {
  readonly history: MoveHistory<TPlayerState, TMove>
  readonly completion: CompletionState
  readonly elapsedTime: ElapsedTime
}

export function createGameSession<TPlayerState, TMove>(
  initialState: TPlayerState,
): GameSession<TPlayerState, TMove> {
  return {
    history: createMoveHistory<TPlayerState, TMove>(initialState),
    completion: 'not-started',
    elapsedTime: createElapsedTime(),
  }
}

export function applyGameMove<TPlayerState, TMove>(
  session: GameSession<TPlayerState, TMove>,
  move: TMove,
  reduce: MoveReducer<TPlayerState, TMove>,
  nowMs: number,
): GameSession<TPlayerState, TMove> {
  return {
    history: applyMove(session.history, move, reduce),
    completion: 'in-progress',
    elapsedTime: startElapsedTime(session.elapsedTime, nowMs),
  }
}

export function undoGameMove<TPlayerState, TMove>(
  session: GameSession<TPlayerState, TMove>,
  nowMs: number,
): GameSession<TPlayerState, TMove> {
  const history = undo(session.history)
  if (history === session.history) {
    return session
  }

  return {
    history,
    completion: 'in-progress',
    elapsedTime: startElapsedTime(session.elapsedTime, nowMs),
  }
}

export function redoGameMove<TPlayerState, TMove>(
  session: GameSession<TPlayerState, TMove>,
  nowMs: number,
): GameSession<TPlayerState, TMove> {
  const history = redo(session.history)
  if (history === session.history) {
    return session
  }

  return {
    history,
    completion: 'in-progress',
    elapsedTime: startElapsedTime(session.elapsedTime, nowMs),
  }
}

export function completeGame<TPlayerState, TMove>(
  session: GameSession<TPlayerState, TMove>,
  nowMs: number,
): GameSession<TPlayerState, TMove> {
  return {
    ...session,
    completion: 'completed',
    elapsedTime: pauseElapsedTime(session.elapsedTime, nowMs),
  }
}

export function resetGame<TPlayerState, TMove>(
  session: GameSession<TPlayerState, TMove>,
): GameSession<TPlayerState, TMove> {
  return {
    history: resetHistory(session.history),
    completion: 'not-started',
    elapsedTime: createElapsedTime(),
  }
}
