"use client"

import React, { useState } from "react"
import { ReleaseLineSettings } from "./ReleaseLineSettings"
import { ReleaseLineConfig } from "./HillChartApp"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

export const ReleaseLineSettingsDemo: React.FC = () => {
  const [config, setConfig] = useState<ReleaseLineConfig>({
    enabled: false,
    color: "#ff00ff",
    text: "",
  })

  return (
    <div className="p-8 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Release Line Settings Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <ReleaseLineSettings config={config} onConfigChange={setConfig} />
          
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="text-sm font-medium mb-2">Current Configuration:</h3>
            <pre className="text-xs">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}