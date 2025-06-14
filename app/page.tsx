"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Plus, Settings, Trash2 } from "lucide-react"

interface Dot {
  id: string
  label: string
  x: number
  y: number
  color: string
}

interface Collection {
  id: string
  name: string
  dots: Dot[]
}

const defaultColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]

const generateBellCurvePath = (width = 300, height = 100, centerX = 200) => {
  const points: string[] = []
  const startX = centerX - width / 2
  const endX = centerX + width / 2
  const baseY = 150

  // Generate points for bell curve using normal distribution-like formula
  for (let x = startX; x <= endX; x += 5) {
    const normalizedX = (x - centerX) / (width / 6) // Normalize to standard deviation
    const y = baseY - height * Math.exp(-0.5 * normalizedX * normalizedX)
    points.push(`${x === startX ? "M" : "L"} ${x} ${y}`)
  }

  return points.join(" ")
}

export default function HillChartGenerator() {
  const [collections, setCollections] = useState<Collection[]>([
    {
      id: "project-a",
      name: "Project A",
      dots: [
        { id: "1", label: "Adding Collections", x: 75, y: 45, color: "#22c55e" },
        { id: "2", label: "Adding Dots to Collections", x: 65, y: 35, color: "#eab308" },
        { id: "3", label: "Tweaking Dots color and size", x: 25, y: 25, color: "#f97316" },
        { id: "4", label: "Saving to PNG, SVG and CPB", x: 15, y: 15, color: "#3b82f6" },
      ],
    },
  ])

  const [selectedCollection, setSelectedCollection] = useState("project-a")
  const [newDotLabel, setNewDotLabel] = useState("")
  const [isDragging, setIsDragging] = useState<string | null>(null)

  const currentCollection = collections.find((c) => c.id === selectedCollection)

  const getHillY = (x: number) => {
    // Bell curve equation using normal distribution
    const centerX = 50
    const width = 100
    const height = 80
    const normalizedX = Math.max(0, Math.min(100, x))
    const relativeX = (normalizedX - centerX) / (width / 6) // Normalize to standard deviation
    const y = height * Math.exp(-0.5 * relativeX * relativeX)
    return 50 - y * 0.6 // Scale and invert for SVG coordinates
  }

  const handleDotDrag = (dotId: string, clientX: number, clientY: number, rect: DOMRect) => {
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = getHillY(x)

    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === selectedCollection
          ? {
              ...collection,
              dots: collection.dots.map((dot) =>
                dot.id === dotId ? { ...dot, x: Math.max(0, Math.min(100, x)), y } : dot,
              ),
            }
          : collection,
      ),
    )
  }

  const addDot = () => {
    if (!newDotLabel.trim()) return

    const newDot: Dot = {
      id: Date.now().toString(),
      label: newDotLabel,
      x: 50,
      y: getHillY(50),
      color: defaultColors[Math.floor(Math.random() * defaultColors.length)],
    }

    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === selectedCollection ? { ...collection, dots: [...collection.dots, newDot] } : collection,
      ),
    )

    setNewDotLabel("")
  }

  const removeDot = (dotId: string) => {
    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === selectedCollection
          ? { ...collection, dots: collection.dots.filter((dot) => dot.id !== dotId) }
          : collection,
      ),
    )
  }

  const exportChart = (format: string) => {
    // This would implement actual export functionality
    console.log(`Exporting as ${format}`)
  }

  return (
    <div className="min-h-screen p-4 bg-transparent">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportChart("PNG")}>
                  <Download className="w-4 h-4 mr-1" />
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportChart("SVG")}>
                  <Download className="w-4 h-4 mr-1" />
                  SVG
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportChart("CPB")}>
                  <Download className="w-4 h-4 mr-1" />
                  CPB
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="relative w-full h-96 bg-white -m-2">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 400 200"
                  className="overflow-visible w-full h-full"
                  onMouseMove={(e) => {
                    if (isDragging) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const x = ((e.clientX - rect.left) / rect.width) * 100
                      handleDotDrag(isDragging, e.clientX, e.clientY, rect)
                    }
                  }}
                  onMouseUp={() => setIsDragging(null)}
                >
                  {/* Bell curve */}
                  <path
                    className="bg-transparent shadow-none leading-9"
                    d={generateBellCurvePath(400, 100, 200)}
                    stroke="#000"
                    strokeWidth="1"
                    fill="none"
                  />

                  {/* Base line */}
                  <line className="leading-3" x1="0" y1="150" x2="400" y2="150" stroke="#000" strokeWidth="1" />

                  {/* Center divider */}
                  <line x1="200" y1="50" x2="200" y2="150" stroke="#666" strokeWidth="1" strokeDasharray="5,5" />

                  {/* Labels */}
                  <text x="20" y="165" textAnchor="middle" className="text-[10px] fill-gray-600 font-normal leading-4">
                    Discovery
                  </text>
                  <text x="200" y="195" textAnchor="middle" className="font-semibold text-sm">
                    {currentCollection?.name}
                  </text>
                  <text x="380" y="165" textAnchor="middle" className="text-[10px] fill-gray-600">
                    Delivery
                  </text>

                  {/* Dots */}
                  {currentCollection?.dots.map((dot) => (
                    <g key={dot.id}>
                      <circle
                        cx={(dot.x / 100) * 400}
                        cy={50 + (dot.y / 100) * 100}
                        r="8"
                        fill={dot.color}
                        stroke="#fff"
                        strokeWidth="2"
                        className="cursor-pointer hover:r-10 transition-all"
                        onMouseDown={() => setIsDragging(dot.id)}
                      />
                      <text
                        x={(dot.x / 100) * 400}
                        y={35 + (dot.y / 100) * 100}
                        textAnchor="middle"
                        className="text-xs fill-gray-700 pointer-events-none"
                      >
                        {dot.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hill Chart Generator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Collections</label>
                <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Dots</CardTitle>
              <Settings className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new dot..."
                  value={newDotLabel}
                  onChange={(e) => setNewDotLabel(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addDot()}
                />
                <Button size="sm" onClick={addDot}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {currentCollection?.dots.map((dot) => (
                  <div key={dot.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: dot.color }}
                    />
                    <span className="text-sm flex-1 truncate">{dot.label}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeDot(dot.id)} className="h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
