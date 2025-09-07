"use client"

import React, { useState } from "react"
import { ReleaseLineSettings } from "./ReleaseLineSettings"
import { ReleaseLineConfig } from "./HillChartApp"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

/**
 * Demo component to test responsive design and accessibility features
 * of the ReleaseLineSettings component across different screen sizes
 */
export const ReleaseLineSettingsDemo: React.FC = () => {
  const [config, setConfig] = useState<ReleaseLineConfig>({
    enabled: false,
    color: "#ff00ff",
    text: ""
  })

  return (
    <div className="min-h-screen p-4 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Release Line Settings - Responsive Design Demo</CardTitle>
            <p className="text-sm text-muted-foreground">
              Test the responsive behavior and accessibility features by resizing your browser window
              and using keyboard navigation.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mobile Size Simulation */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Mobile (320px width)</h3>
                <div 
                  className="border border-dashed border-muted-foreground p-4 bg-muted/20"
                  style={{ width: '320px', maxWidth: '100%' }}
                >
                  <ReleaseLineSettings
                    config={config}
                    onConfigChange={setConfig}
                  />
                </div>
              </div>

              {/* Tablet Size Simulation */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Tablet (768px width)</h3>
                <div 
                  className="border border-dashed border-muted-foreground p-4 bg-muted/20"
                  style={{ width: '400px', maxWidth: '100%' }}
                >
                  <ReleaseLineSettings
                    config={config}
                    onConfigChange={setConfig}
                  />
                </div>
              </div>

              {/* Desktop Size Simulation */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Desktop (1024px+ width)</h3>
                <div 
                  className="border border-dashed border-muted-foreground p-4 bg-muted/20"
                  style={{ width: '500px', maxWidth: '100%' }}
                >
                  <ReleaseLineSettings
                    config={config}
                    onConfigChange={setConfig}
                  />
                </div>
              </div>
            </div>

            {/* Current Configuration Display */}
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="text-sm font-medium mb-2">Current Configuration:</h3>
              <pre className="text-xs text-muted-foreground">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>

            {/* Accessibility Testing Instructions */}
            <div className="mt-6 p-4 border border-border rounded-lg">
              <h3 className="text-sm font-medium mb-2">Accessibility Testing:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use Tab key to navigate through all interactive elements</li>
                <li>• Use Space or Enter to toggle the release line switch</li>
                <li>• Use screen reader to verify ARIA labels and descriptions</li>
                <li>• Test color picker with keyboard navigation</li>
                <li>• Verify character counter updates with live region announcements</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}