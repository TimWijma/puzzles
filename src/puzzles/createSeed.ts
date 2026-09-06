export function createPuzzleSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = crypto.getRandomValues(new Uint32Array(2))
    return `${values[0]?.toString(36)}${values[1]?.toString(36)}`
  }

  return `puzzle-${Date.now().toString(36)}`
}

