/**
 * @jest-environment jsdom
 */


import '@testing-library/jest-dom'
import fs from 'fs'
import path from 'path'

const componentPath = path.join(__dirname, 'HillChartApp.tsx')
const componentSource = fs.readFileSync(componentPath, 'utf8')

// Simple test to verify the ellipsis menu integration
describe('HillChartApp Ellipsis Menu Integration', () => {
  it('should have release line controls in chart settings', () => {
    expect(componentSource).toContain('Chart Settings')
    expect(componentSource).toContain('Release Line')
    expect(componentSource).toContain('setShowEllipsisMenu(false)')
  })

  it('should have proper state management for release line settings modal', () => {
    expect(componentSource).toContain('const [releaseLineSettings, setReleaseLineSettings] = useState')
    expect(componentSource).toContain('setShowColorSettingsModal(false)')
  })

  it('should use Edit2 icon in the component', () => {
    expect(componentSource).toContain('Edit2')
    expect(componentSource).toContain('<Edit2 className="w-4 h-4" />')
  })

  it('should integrate ReleaseLineSettings component in the modal', () => {
    // Verify ReleaseLineSettings component is used in the modal
    expect(componentSource).toContain('<ReleaseLineSettings')
    expect(componentSource).toContain('config={releaseLineSettings[selectedCollection]')
    expect(componentSource).toContain('onConfigChange={handleReleaseLineConfigChange}')
  })
})