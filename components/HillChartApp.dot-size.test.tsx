/**
 * @jest-environment jsdom
 */

import fs from 'fs'
import path from 'path'

const componentPath = path.join(__dirname, 'HillChartApp.tsx')
const componentSource = fs.readFileSync(componentPath, 'utf8')

describe('HillChartApp discovery dot sizing', () => {
  it('uses dot.size for chart dot radius in discovery and delivery', () => {
    expect(componentSource).toContain('const dotRadius = 4 + dot.size * 2')
    expect(componentSource).not.toContain('displayDotSize')
  })

  it('does not reset dot size when dragging or editing percent by phase', () => {
    expect(componentSource).not.toMatch(/updates\.size\s*=\s*1/)
    expect(componentSource).not.toMatch(/updates\.size\s*=\s*3/)
  })
})
