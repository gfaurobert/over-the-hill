import { getCollectionSeverity, CollectionSeverity, sortCollectionsBySeverity } from '../collectionSeverity'

const palette = {
  discovery: '#b0cdfb',
  upslope: '#a6e7be',
  dangerZone: '#f8b4b4',
  downslope: '#fcc7a1',
  done: '#d0bdfb',
}

const dot = (overrides: Partial<{ color: string; archived: boolean }> = {}) => ({
  id: Math.random().toString(36).slice(2),
  label: 'd',
  x: 0,
  y: 0,
  color: palette.upslope,
  size: 3,
  archived: false,
  flag_for_today: false,
  ...overrides,
})

const coll = (dots: ReturnType<typeof dot>[]) => ({
  id: 'c',
  name: 'c',
  status: 'active' as const,
  dots,
})

describe('getCollectionSeverity', () => {
  it('returns rank 6 with null indicator for an empty collection', () => {
    const result = getCollectionSeverity(coll([]), palette)
    expect(result.rank).toBe(6)
    expect(result.indicatorColor).toBeNull()
    expect(result.statusLabel).toBeNull()
  })

  it('returns rank 5 for a done-only collection', () => {
    const result = getCollectionSeverity(coll([dot({ color: palette.done })]), palette)
    expect(result.rank).toBe(5)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns rank 4 for a discovery-only collection', () => {
    const result = getCollectionSeverity(coll([dot({ color: palette.discovery })]), palette)
    expect(result.rank).toBe(4)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns rank 4 when discovery and done are mixed', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: palette.discovery }), dot({ color: palette.done })]),
      palette,
    )
    expect(result.rank).toBe(4)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns rank 3 with emerald indicator for on-track only', () => {
    const result = getCollectionSeverity(coll([dot({ color: palette.upslope })]), palette)
    expect(result.rank).toBe(3)
    expect(result.indicatorColor).toBe('emerald')
    expect(result.statusLabel).toBe('On Track')
  })

  it('returns rank 3 when on-track is mixed with done', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: palette.upslope }), dot({ color: palette.done })]),
      palette,
    )
    expect(result.rank).toBe(3)
    expect(result.indicatorColor).toBe('emerald')
  })

  it('returns rank 2 with amber indicator when at-risk is the worst', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: palette.downslope }), dot({ color: palette.upslope })]),
      palette,
    )
    expect(result.rank).toBe(2)
    expect(result.indicatorColor).toBe('amber')
    expect(result.statusLabel).toBe('At Risk')
  })

  it('returns rank 1 with red indicator when any dot is blocked', () => {
    const result = getCollectionSeverity(
      coll([
        dot({ color: palette.dangerZone }),
        dot({ color: palette.downslope }),
        dot({ color: palette.upslope }),
      ]),
      palette,
    )
    expect(result.rank).toBe(1)
    expect(result.indicatorColor).toBe('red')
    expect(result.statusLabel).toBe('Blocked')
  })

  it('ignores archived dots when computing severity', () => {
    const result = getCollectionSeverity(
      coll([
        dot({ color: palette.dangerZone, archived: true }),
        dot({ color: palette.upslope }),
      ]),
      palette,
    )
    expect(result.rank).toBe(3)
    expect(result.indicatorColor).toBe('emerald')
  })

  it('honors custom palettes (semantic slot, not literal color)', () => {
    const customPalette = { ...palette, dangerZone: '#ff8800' }
    const result = getCollectionSeverity(
      coll([dot({ color: '#ff8800' })]),
      customPalette,
    )
    expect(result.rank).toBe(1)
    expect(result.indicatorColor).toBe('red')
  })

  it('ignores dots whose color matches no palette slot', () => {
    const result = getCollectionSeverity(
      coll([dot({ color: '#123456' })]),
      palette,
    )
    expect(result.rank).toBe(6)
    expect(result.indicatorColor).toBeNull()
  })

  it('returns a correctly narrowed discriminated union', () => {
    const result: CollectionSeverity = getCollectionSeverity(
      coll([dot({ color: palette.dangerZone })]),
      palette,
    )
    if (result.rank === 1) {
      const color: 'red' = result.indicatorColor
      const label: 'Blocked' = result.statusLabel
      expect(color).toBe('red')
      expect(label).toBe('Blocked')
    }
  })
})

describe('sortCollectionsBySeverity', () => {
  const make = (
    id: string,
    color: string,
    created_at?: string,
  ) => ({
    id,
    name: id,
    status: 'active' as const,
    created_at,
    dots: color ? [dot({ color })] : [],
  })

  it('orders strictly by severity rank when no ties', () => {
    const input = [
      make('done', palette.done),
      make('blocked', palette.dangerZone),
      make('ontrack', palette.upslope),
      make('atrisk', palette.downslope),
      make('discovery', palette.discovery),
      make('empty', ''),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['blocked', 'atrisk', 'ontrack', 'discovery', 'done', 'empty'])
  })

  it('breaks ties with created_at descending (newest first)', () => {
    const input = [
      make('oldest', palette.dangerZone, '2024-01-01T00:00:00.000Z'),
      make('newest', palette.dangerZone, '2025-01-01T00:00:00.000Z'),
      make('middle', palette.dangerZone, '2024-06-01T00:00:00.000Z'),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['newest', 'middle', 'oldest'])
  })

  it('keeps stable relative order when created_at is missing', () => {
    const input = [
      make('a', palette.upslope),
      make('b', palette.upslope),
      make('c', palette.upslope),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('places collections with created_at ahead of those without at the same rank', () => {
    const input = [
      make('no-date', palette.dangerZone),
      make('with-date', palette.dangerZone, '2025-01-01T00:00:00.000Z'),
    ]
    const ids = sortCollectionsBySeverity(input, palette).map((c) => c.id)
    expect(ids).toEqual(['with-date', 'no-date'])
  })

  it('does not mutate the input array', () => {
    const input = [
      make('ontrack', palette.upslope),
      make('blocked', palette.dangerZone),
    ]
    const originalOrder = input.map((c) => c.id)
    sortCollectionsBySeverity(input, palette)
    expect(input.map((c) => c.id)).toEqual(originalOrder)
  })
})
