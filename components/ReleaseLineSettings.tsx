"use client"

import React from "react"
import { Switch } from "./ui/switch"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { ReleaseLineConfig } from "./HillChartApp"

interface ReleaseLineSettingsProps {
  config: ReleaseLineConfig
  onConfigChange: (config: ReleaseLineConfig) => void
}

export const ReleaseLineSettings: React.FC<ReleaseLineSettingsProps> = ({
  config,
  onConfigChange,
}) => {
  const handleToggleChange = (enabled: boolean) => {
    onConfigChange({
      ...config,
      enabled,
    })
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      color: e.target.value,
    })
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    // Enforce 12 character limit as per requirements
    if (text.length <= 12) {
      onConfigChange({
        ...config,
        text,
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="release-line-toggle" className="text-sm font-medium">
          Release Line
        </Label>
        <Switch
          id="release-line-toggle"
          checked={config.enabled}
          onCheckedChange={handleToggleChange}
        />
      </div>

      {/* Color and Text Settings - Only show when enabled */}
      {config.enabled && (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
          {/* Color Picker */}
          <div className="space-y-2">
            <Label htmlFor="release-line-color" className="text-sm">
              Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="release-line-color"
                type="color"
                value={config.color}
                onChange={handleColorChange}
                className="w-8 h-8 rounded border border-input cursor-pointer"
                title="Choose release line color"
                data-testid="color-picker"
              />
              <Input
                value={config.color}
                onChange={handleColorChange}
                placeholder="#ff00ff"
                className="flex-1 text-sm font-mono"
                maxLength={7}
                pattern="^#[0-9A-Fa-f]{6}$"
                data-testid="color-text-input"
              />
            </div>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="release-line-text" className="text-sm">
              Label
            </Label>
            <div className="space-y-1">
              <Input
                id="release-line-text"
                value={config.text}
                onChange={handleTextChange}
                placeholder="Q4 2024, Release Date, etc."
                className="text-sm"
                maxLength={12}
                data-testid="text-input"
              />
              <div className="text-xs text-muted-foreground">
                {config.text.length}/12 characters
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}