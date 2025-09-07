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
    const color = e.target.value
    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(color) || color === '') {
      onConfigChange({
        ...config,
        color,
      })
    }
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
    <div className="space-y-4" role="group" aria-labelledby="release-line-settings-heading">
      {/* Accessible heading for screen readers */}
      <h3 id="release-line-settings-heading" className="sr-only">
        Release Line Settings
      </h3>
      
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="release-line-toggle" className="text-sm font-medium">
          Release Line
        </Label>
        <Switch
          id="release-line-toggle"
          checked={config.enabled}
          onCheckedChange={handleToggleChange}
          aria-describedby="release-line-toggle-description"
        />
      </div>
      <div id="release-line-toggle-description" className="sr-only">
        Toggle to enable or disable the release line on your hill chart
      </div>

      {/* Color and Text Settings - Only show when enabled */}
      {config.enabled && (
        <div 
          className="space-y-3 pl-4 border-l-2 border-muted"
          role="group"
          aria-labelledby="release-line-customization-heading"
        >
          <h4 id="release-line-customization-heading" className="sr-only">
            Release Line Customization
          </h4>
          
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
                className="w-8 h-8 rounded border border-input cursor-pointer focus:ring-2 focus:ring-ring focus:ring-offset-2"
                title="Choose release line color"
                aria-label="Release line color picker"
                aria-describedby="color-picker-description"
                data-testid="color-picker"
              />
              <Input
                value={config.color}
                onChange={handleColorChange}
                placeholder="#ff00ff"
                className="flex-1 text-sm font-mono"
                maxLength={7}
                pattern="^#[0-9A-Fa-f]{6}$"
                aria-label="Release line color hex value"
                aria-describedby="color-input-description"
                data-testid="color-text-input"
              />
            </div>
            <div id="color-picker-description" className="sr-only">
              Use the color picker or enter a hex color code to customize the release line color
            </div>
            <div id="color-input-description" className="sr-only">
              Enter a valid hex color code starting with # followed by 6 characters
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
                aria-describedby="text-input-description text-length-counter"
                data-testid="text-input"
              />
              <div 
                id="text-length-counter" 
                className="text-xs text-muted-foreground"
                aria-live="polite"
              >
                {config.text.length}/12 characters
              </div>
              <div id="text-input-description" className="sr-only">
                Enter a label for your release line. Maximum 12 characters allowed.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}