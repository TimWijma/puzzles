export interface ElapsedTime {
  readonly accumulatedMs: number
  readonly runningSinceMs: number | null
}

export function createElapsedTime(): ElapsedTime {
  return { accumulatedMs: 0, runningSinceMs: null }
}

export function startElapsedTime(timer: ElapsedTime, nowMs: number): ElapsedTime {
  return timer.runningSinceMs === null ? { ...timer, runningSinceMs: nowMs } : timer
}

export function pauseElapsedTime(timer: ElapsedTime, nowMs: number): ElapsedTime {
  if (timer.runningSinceMs === null) {
    return timer
  }

  return {
    accumulatedMs: timer.accumulatedMs + Math.max(0, nowMs - timer.runningSinceMs),
    runningSinceMs: null,
  }
}

export function getElapsedMilliseconds(timer: ElapsedTime, nowMs: number): number {
  return timer.runningSinceMs === null
    ? timer.accumulatedMs
    : timer.accumulatedMs + Math.max(0, nowMs - timer.runningSinceMs)
}
