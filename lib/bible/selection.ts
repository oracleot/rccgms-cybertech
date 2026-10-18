/** Toggle one verse while preserving the canonical passage order. */
export function toggleOrderedSelection<T>(
  all: readonly T[],
  selected: readonly T[],
  item: T,
  key: (value: T) => string
): T[] | null {
  const id = key(item)
  const isSelected = selected.some((value) => key(value) === id)
  if (isSelected && selected.length === 1) return null
  return isSelected
    ? selected.filter((value) => key(value) !== id)
    : all.filter((value) => selected.some((current) => key(current) === key(value)) || key(value) === id)
}
