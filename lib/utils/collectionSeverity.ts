export interface DotColorPreferences {
  discovery: string
  upslope: string
  dangerZone: string
  downslope: string
  done: string
}

interface CollectionDotLike {
  color: string
  archived?: boolean
}

export interface CollectionLike {
  dots: CollectionDotLike[]
}

export type CollectionSeverity =
  | { rank: 1; indicatorColor: 'red'; statusLabel: 'Blocked' }
  | { rank: 2; indicatorColor: 'amber'; statusLabel: 'At Risk' }
  | { rank: 3; indicatorColor: 'emerald'; statusLabel: 'On Track' }
  | { rank: 4; indicatorColor: null; statusLabel: null }
  | { rank: 5; indicatorColor: null; statusLabel: null }
  | { rank: 6; indicatorColor: null; statusLabel: null }

const RANK_BY_SLOT = {
  dangerZone: 1,
  downslope: 2,
  upslope: 3,
  discovery: 4,
  done: 5,
} as const

type SlotName = keyof typeof RANK_BY_SLOT

function slotForColor(color: string, palette: DotColorPreferences): SlotName | null {
  if (color === palette.dangerZone) return 'dangerZone'
  if (color === palette.downslope) return 'downslope'
  if (color === palette.upslope) return 'upslope'
  if (color === palette.discovery) return 'discovery'
  if (color === palette.done) return 'done'
  return null
}

export function getCollectionSeverity(
  collection: CollectionLike,
  palette: DotColorPreferences,
): CollectionSeverity {
  let bestRank = 6

  for (const dot of collection.dots) {
    if (dot.archived) continue
    const slot = slotForColor(dot.color, palette)
    if (!slot) continue
    const rank = RANK_BY_SLOT[slot]
    if (rank < bestRank) bestRank = rank
  }

  switch (bestRank) {
    case 1:
      return { rank: 1, indicatorColor: 'red', statusLabel: 'Blocked' }
    case 2:
      return { rank: 2, indicatorColor: 'amber', statusLabel: 'At Risk' }
    case 3:
      return { rank: 3, indicatorColor: 'emerald', statusLabel: 'On Track' }
    case 4:
      return { rank: 4, indicatorColor: null, statusLabel: null }
    case 5:
      return { rank: 5, indicatorColor: null, statusLabel: null }
    default:
      return { rank: 6, indicatorColor: null, statusLabel: null }
  }
}

interface SortableCollection extends CollectionLike {
  created_at?: string
}

export function sortCollectionsBySeverity<T extends SortableCollection>(
  collections: readonly T[],
  palette: DotColorPreferences,
): T[] {
  const withRank = collections.map((collection, index) => ({
    collection,
    rank: getCollectionSeverity(collection, palette).rank,
    index,
  }))

  withRank.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    const aTs = a.collection.created_at ? Date.parse(a.collection.created_at) : NaN
    const bTs = b.collection.created_at ? Date.parse(b.collection.created_at) : NaN
    const aHas = !Number.isNaN(aTs)
    const bHas = !Number.isNaN(bTs)
    if (aHas && bHas) return bTs - aTs
    if (aHas) return -1
    if (bHas) return 1
    return a.index - b.index
  })

  return withRank.map((entry) => entry.collection)
}
