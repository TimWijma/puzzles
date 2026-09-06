/** The small Storage subset keeps puzzle persistence testable without a browser. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

