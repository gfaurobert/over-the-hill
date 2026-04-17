import { getCollectionSeverity, CollectionSeverity } from '../collectionSeverity'

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
