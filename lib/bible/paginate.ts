export type BibleDisplayMode = "single" | "auto" | "multi"

export function balancedSplit<T>(all: T[], pageCount: number, weight: (item: T) => number): T[][] {
  const total = all.reduce((sum, item) => sum + weight(item), 0)
  const groups: T[][] = []
  let current: T[] = []
  let accumulated = 0
  for (const item of all) {
    if (
      current.length &&
      groups.length < pageCount - 1 &&
      accumulated + weight(item) > (total * (groups.length + 1)) / pageCount
    ) {
      groups.push(current)
      current = []
    }
    current.push(item)
    accumulated += weight(item)
  }
  groups.push(current)
  return groups
}

/** Single mode intentionally pages one verse at a time; auto/multi pack by the supplied fit threshold. */
export function paginateVerses<T>(
  all: T[],
  mode: BibleDisplayMode,
  fits: (page: T[]) => boolean,
  weight: (item: T) => number
): { mode: "single" | "multi"; pages: T[][] } {
  if (mode === "single" || all.length === 1) {
    return { mode: "single", pages: all.map((item) => [item]) }
  }

  const greedy: T[][] = []
  let index = 0
  while (index < all.length) {
    let low = 1
    let high = all.length - index
    if (fits(all.slice(index, index + high))) {
      greedy.push(all.slice(index))
      break
    }
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (fits(all.slice(index, index + middle))) low = middle
      else high = middle - 1
    }
    greedy.push(all.slice(index, index + low))
    index += low
  }

  let pages = greedy
  if (greedy.length > 1) {
    const balanced = balancedSplit(all, greedy.length, weight)
    if (balanced.every((page) => fits(page))) pages = balanced
  }
  return { mode: "multi", pages }
}
