/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom'
import fs from 'fs'
import path from 'path'

const componentPath = path.join(__dirname, 'HillChartApp.tsx')
const componentSource = fs.readFileSync(componentPath, 'utf8')

describe('HillChartApp sidebar severity wiring', () => {
  it('imports the severity helpers from @/lib/utils/collectionSeverity', () => {
    expect(componentSource).toMatch(
      /from\s+["']@\/lib\/utils\/collectionSeverity["']/,
    )
    expect(componentSource).toContain('getCollectionSeverity')
    expect(componentSource).toContain('sortCollectionsBySeverity')
  })

  it('sorts non-Today collections with sortCollectionsBySeverity', () => {
    expect(componentSource).toMatch(
      /sortCollectionsBySeverity\(\s*collections\.filter\(\(collection\)\s*=>\s*collection\.id\s*!==\s*todayCollectionId\)\s*,\s*dotColors\s*,?\s*\)/,
    )
  })

  it('renders the floating severity dot with ring-2 ring-background and pointer-events-none', () => {
    expect(componentSource).toContain('data-testid="collection-severity-dot"')
    expect(componentSource).toContain('pointer-events-none absolute top-1 right-1 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-background')
  })

  it('maps each indicator color to the correct Tailwind classes', () => {
    expect(componentSource).toContain('severity.indicatorColor === "red" && "bg-red-500 dark:bg-red-400"')
    expect(componentSource).toContain('severity.indicatorColor === "amber" && "bg-amber-400 dark:bg-amber-300"')
    expect(componentSource).toContain('severity.indicatorColor === "emerald" && "bg-emerald-500 dark:bg-emerald-400"')
  })

  it('computes the aria-label from severity.statusLabel', () => {
    expect(componentSource).toMatch(
      /aria-label=\{ariaLabel\}/,
    )
    expect(componentSource).toMatch(
      /severity\.statusLabel\s*\n?\s*\?\s*`\$\{collection\.name\},\s*\$\{severity\.statusLabel\}`\s*\n?\s*:\s*collection\.name/,
    )
  })

  it('extends the Collection interface with an optional created_at field', () => {
    expect(componentSource).toMatch(/created_at\?:\s*string/)
  })
})
