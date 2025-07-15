"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CopyIcon,
  Download,
  ArrowUpDown,
  Trash2,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  MoreHorizontal,
  UploadIcon,
  DownloadIcon,
  Check,
  FileImage,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Info,
  FolderOpen,
  Heart,
  Edit2,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"

interface Dot {
  id: string
  label: string
  x: number
  y: number
  color: string
  size: number // Add size property (1-5)
}

interface Collection {
  id: string
  name: string
  dots: Dot[]
}

interface Snapshot {
  date: string // YYYY-MM-DD format
  collectionId: string
  collectionName: string
  dots: Dot[]
  timestamp: number
}

interface ExportData {
  collections: Collection[]
  snapshots: Snapshot[]
  exportDate: string
  version: string
}

const defaultColors = ["#3b82f6", "#22c55e", "#ef4444", "#f97316", "#8b5cf6"] // blue, green, red, orange, purple

const generateBellCurvePath = (width = 300, height = 150, centerX = 200) => {
  const points: string[] = []
  const startX = centerX - width / 2
  const endX = centerX + width / 2
  const baseY = 145

  // Generate points for bell curve using normal distribution-like formula
  for (let x = startX; x <= endX; x += 5) {
    const normalizedX = (x - centerX) / (width / 6) // Normalize to standard deviation
    const y = baseY - height * Math.exp(-0.5 * normalizedX * normalizedX)
    points.push(`${x === startX ? "M" : "L"} ${x} ${y}`)
  }

  return points.join(" ")
}

export default function HillChartGenerator() {
  const getHillY = (x: number) => {
    const centerX = 300 // SVG center point (changed from 200 to 300)
    const width = 600 // Full SVG width (changed from 400 to 600)
    const height = 150 // Bell curve height - increased from 100 to 150
    const baseY = 145 // Base line Y position

    // Convert percentage x to SVG coordinates
    const svgX = (x / 100) * 600 // Changed from 400 to 600

    // Calculate Y using the same formula as generateBellCurvePath
    const normalizedX = (svgX - centerX) / (width / 6)
    const y = baseY - height * Math.exp(-0.5 * normalizedX * normalizedX)

    return y
  }
  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [newDotLabel, setNewDotLabel] = useState("")
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [collectionInput, setCollectionInput] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ dotId: string; dotLabel: string } | null>(null)
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false)
  const { theme, setTheme } = useTheme()
  const ellipsisMenuRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "success" | "error">("idle")
  const [copyFormat, setCopyFormat] = useState<"PNG" | "SVG">("PNG")
  const [hideCollectionName, setHideCollectionName] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)

  // Snapshot-related state
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)

  // Storage location state
  const [storageLocation, setStorageLocation] = useState<string>("")
  const [showStorageLocationModal, setShowStorageLocationModal] = useState(false)

  // Platform and installation state
  const [platform, setPlatform] = useState<string>("")
  const [showInstallConfirm, setShowInstallConfirm] = useState(false)
  const [installStatus, setInstallStatus] = useState<"idle" | "installing" | "success" | "error">("idle")
  const [installMessage, setInstallMessage] = useState("")

  // Add new state for dragging feedback
  const [draggingDot, setDraggingDot] = useState<{ id: string; x: number; y: number } | null>(null)

  // Add new states for snapshot viewing and success (around line 130, after other states)
  const [isViewingSnapshot, setIsViewingSnapshot] = useState(false)
  const [originalCollections, setOriginalCollections] = useState<Collection[]>([])
  const [snapshotSuccess, setSnapshotSuccess] = useState(false)

  // Add editing states (around line 130)
  const [isEditingCollection, setIsEditingCollection] = useState(false)
  const [editingCollectionName, setEditingCollectionName] = useState("")
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Check if running in Electron
  const isElectron = typeof window !== "undefined" && window.electronAPI

  // Load data from localStorage or Electron store
  const loadFromStorage = async () => {
    if (typeof window !== "undefined") {
      try {
        let savedData = null

        if (isElectron) {
          // Use Electron's secure storage
          savedData = await window.electronAPI.loadData()
        } else {
          // Fallback to localStorage for web version
          const savedCollections = localStorage.getItem("hill-chart-collections")
          const savedSnapshots = localStorage.getItem("hill-chart-snapshots")
          const savedSelectedCollection = localStorage.getItem("hill-chart-selected-collection")
          const savedCollectionInput = localStorage.getItem("hill-chart-collection-input")
          const savedHideCollectionName = localStorage.getItem("hill-chart-hide-collection-name")
          const savedCopyFormat = localStorage.getItem("hill-chart-copy-format")

          savedData = {
            collections: savedCollections ? JSON.parse(savedCollections) : null,
            snapshots: savedSnapshots ? JSON.parse(savedSnapshots) : null,
            selectedCollection: savedSelectedCollection,
            collectionInput: savedCollectionInput,
            hideCollectionName: savedHideCollectionName ? JSON.parse(savedHideCollectionName) : null,
            copyFormat: savedCopyFormat,
          }
        }

        if (savedData.collections) {
          setCollections(savedData.collections)
          setOriginalCollections(savedData.collections) // Add this
        }
        if (savedData.snapshots) {
          setSnapshots(savedData.snapshots)
        }
        if (savedData.selectedCollection) {
          setSelectedCollection(savedData.selectedCollection)
        }
        if (savedData.collectionInput) {
          setCollectionInput(savedData.collectionInput)
        }
        if (savedData.hideCollectionName !== null) {
          setHideCollectionName(savedData.hideCollectionName)
        }
        if (savedData.copyFormat) {
          setCopyFormat(savedData.copyFormat as "PNG" | "SVG")
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }
  }

  // Save data to localStorage or Electron store
  const saveToStorage = async () => {
    if (typeof window !== "undefined") {
      try {
        const dataToSave = {
          collections,
          snapshots,
          selectedCollection,
          collectionInput,
          hideCollectionName,
          copyFormat,
        }

        if (isElectron) {
          // Use Electron's secure storage
          await window.electronAPI.saveData(dataToSave)
        } else {
          // Fallback to localStorage for web version
          localStorage.setItem("hill-chart-collections", JSON.stringify(collections))
          localStorage.setItem("hill-chart-snapshots", JSON.stringify(snapshots))
          localStorage.setItem("hill-chart-selected-collection", selectedCollection || "")
          localStorage.setItem("hill-chart-collection-input", collectionInput)
          localStorage.setItem("hill-chart-hide-collection-name", JSON.stringify(hideCollectionName))
          localStorage.setItem("hill-chart-copy-format", copyFormat)
        }
      } catch (error) {
        console.error("Error saving data:", error)
      }
    }
  }

  // Load storage location
  const loadStorageLocation = async () => {
    if (isElectron) {
      try {
        const location = await window.electronAPI.getStorageLocation()
        setStorageLocation(location)
      } catch (error) {
        console.error("Error loading storage location:", error)
      }
    }
  }

  // Select storage location
  const selectStorageLocation = async () => {
    if (isElectron) {
      try {
        const newLocation = await window.electronAPI.selectStorageLocation()
        if (newLocation) {
          setStorageLocation(newLocation)
          setShowStorageLocationModal(false)
          setShowEllipsisMenu(false)
        }
      } catch (error) {
        console.error("Error selecting storage location:", error)
        alert("Failed to change storage location. Please try again.")
      }
    }
  }

  const currentCollection = collections.find((c) => c.id === selectedCollection)

  // Calendar helper functions
  const formatDateKey = (date: Date) => {
    return date.toLocaleDateString('sv-SE') // YYYY-MM-DD format using local date
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getSnapshotsForMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return snapshots.filter((snapshot) => {
      const snapshotDate = new Date(snapshot.date)
      return snapshotDate.getFullYear() === year && snapshotDate.getMonth() === month
    })
  }

  const hasSnapshotForDate = (date: Date) => {
    const dateKey = formatDateKey(date)
    return snapshots.some((snapshot) => snapshot.date === dateKey)
  }

  // Update getLocalDateString to use local time components (replace existing)
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Update createSnapshot to set success (replace existing around line 370)
  const createSnapshot = () => {
    if (!currentCollection) return

    const today = new Date()
    const dateString = getLocalDateString(today) // Use new helper

    const newSnapshot = {
      date: dateString,
      collectionId: currentCollection.id,
      collectionName: currentCollection.name,
      dots: currentCollection.dots,
      timestamp: Date.now(), // Add this
    }

    setSnapshots((prev) => [...prev, newSnapshot])
    setSnapshotSuccess(true) // Add success feedback
  }

  // Update loadSnapshot to set viewing state (replace existing around line 400)
  const handleViewSnapshot = (dateString: string) => {
    const snapshotForDate = snapshots.find(s => s.date === dateString)
    if (!snapshotForDate) return

    setOriginalCollections(collections) // Store current
    const snapshotCollection = {
      id: snapshotForDate.collectionId,
      name: snapshotForDate.collectionName,
      dots: snapshotForDate.dots
    }
    setCollections([snapshotCollection]) // Temporarily set to snapshot
    setSelectedCollection(snapshotCollection.id)
    setCollectionInput(snapshotCollection.name)
    setIsViewingSnapshot(true)
    setSelectedSnapshot(dateString)
  }

  // Add handleViewLive function (after loadSnapshot)
  const handleViewLive = () => {
    setCollections(originalCollections)
    setSelectedCollection(originalCollections[0]?.id || null)
    setCollectionInput(originalCollections[0]?.name || "")
    setIsViewingSnapshot(false)
    setSelectedSnapshot(null)
  }

  // Replace renderCalendar with improved version (around line 420)
  const renderCalendar = () => {
    const today = new Date()
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const startDay = startOfMonth.getDay()
    const daysInMonth = endOfMonth.getDate()
    const days = []

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-start-${i}`} className="w-8 h-8"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dateString = getLocalDateString(date)
      const hasSnapshot = snapshots.some((s) => s.date === dateString)
      const isSelected = selectedSnapshot === dateString
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()

      days.push(
        <div key={day} className="flex items-center justify-center">
          <button
            onClick={() => (hasSnapshot ? handleViewSnapshot(dateString) : null)}
            className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
            ${isSelected ? "bg-primary text-primary-foreground" : hasSnapshot ? "bg-accent text-accent-foreground hover:bg-accent/80" : "text-muted-foreground"}
            ${isToday && !isSelected ? "border border-primary" : ""}`}
            disabled={!hasSnapshot}
          >
            {day}
          </button>
        </div>,
      )
    }

    return (
      <div className="bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-medium text-sm">
            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
          <div>Su</div>
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
        </div>
        <div className="grid grid-cols-7 gap-1">{days}</div>
        <div className="flex gap-2 mt-3">
          {isViewingSnapshot ? (
            <Button size="sm" variant="secondary" className="w-full" onClick={handleViewLive}>
              View Live
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className={`w-full flex items-center gap-2 transition-all duration-300 ${snapshotSuccess ? "border-green-500 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:border-green-400 dark:bg-green-400/10 dark:text-green-400 dark:hover:bg-green-400/20" : ""}`}
              onClick={createSnapshot}
            >
              <Camera className="w-4 h-4" />
              {snapshotSuccess ? "New Snapshot Created" : "Snapshot"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    // Only filter when user is actively typing, not when dropdown is opened via button
    if (showDropdown && isTyping) {
      const filtered = collections.filter((collection) =>
        collection.name.toLowerCase().includes(collectionInput.toLowerCase()),
      )
      setFilteredCollections(filtered)
    }
  }, [collectionInput, collections, isTyping]) // Remove showDropdown from dependencies

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setIsTyping(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    // Close ellipsis menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (ellipsisMenuRef.current && !ellipsisMenuRef.current.contains(event.target as Node)) {
        setShowEllipsisMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Load data on component mount
  useEffect(() => {
    loadFromStorage()
  }, [])

  // Load storage location on component mount (Electron only)
  useEffect(() => {
    if (isElectron) {
      loadStorageLocation()
      loadPlatform()
    }
  }, [isElectron])

  // Save data whenever state changes (debounced to prevent excessive saves)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToStorage()
    }, 500) // Debounce by 500ms

    return () => clearTimeout(timeoutId)
  }, [collections, snapshots, selectedCollection, collectionInput, hideCollectionName, copyFormat])

  // Auto-save every 30 seconds as backup
  useEffect(() => {
    const interval = setInterval(() => {
      saveToStorage()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [collections, snapshots, selectedCollection, collectionInput, hideCollectionName, copyFormat])

  // Add effect for snapshotSuccess timeout (after other useEffects)
  useEffect(() => {
    if (snapshotSuccess) {
      const timer = setTimeout(() => {
        setSnapshotSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [snapshotSuccess])

  const handleDotDrag = (dotId: string, clientX: number, clientY: number) => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const svgP = pt.matrixTransform(ctm.inverse())
    let svgX = Math.max(0, Math.min(600, svgP.x))
    const xPercent = (svgX / 600) * 100
    const y = getHillY(xPercent)
    setDraggingDot({ id: dotId, x: xPercent, y })
    
    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === selectedCollection
          ? {
              ...collection,
              dots: collection.dots.map((dot) =>
                dot.id === dotId ? { ...dot, x: xPercent, y } : dot,
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
      color: defaultColors[0], // Default to first color (blue)
      size: 3, // Default size
    }

    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === selectedCollection ? { ...collection, dots: [...collection.dots, newDot] } : collection,
      ),
    )

    setNewDotLabel("")
  }

  const showDeleteConfirm = (dotId: string, dotLabel: string) => {
    setDeleteConfirm({ dotId, dotLabel })
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      setCollections((prev) =>
        prev.map((collection) =>
          collection.id === selectedCollection
            ? { ...collection, dots: collection.dots.filter((dot) => dot.id !== deleteConfirm.dotId) }
            : collection,
        ),
      )
      setDeleteConfirm(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
  }

  const prepareSvgForExport = (): string | null => {
    if (!svgRef.current) return null

    const isDarkMode = document.documentElement.classList.contains("dark")
    const backgroundColor = isDarkMode ? "#0f0f0f" : "#ffffff"
    const textColor = isDarkMode ? "#fafafa" : "#0a0a0a"
    const mutedColor = isDarkMode ? "#a1a1aa" : "#71717a"
    const borderColor = isDarkMode ? "#27272a" : "#e4e4e7"

    const svgElement = svgRef.current.cloneNode(true) as SVGSVGElement
    svgElement.setAttribute("width", "800")
    svgElement.setAttribute("height", "360")
    svgElement.style.backgroundColor = backgroundColor
    // Ensure the viewBox is set for the exported SVG to maintain padding
    svgElement.setAttribute("viewBox", "-50 0 700 180")

    const paths = svgElement.querySelectorAll("path")
    paths.forEach((path) => {
      if (path.getAttribute("stroke") === "currentColor") path.setAttribute("stroke", textColor)
    })

    const lines = svgElement.querySelectorAll("line")
    lines.forEach((line) => {
      if (line.getAttribute("stroke") === "currentColor") line.setAttribute("stroke", textColor)
      if (line.getAttribute("stroke") === "hsl(var(--muted-foreground))") line.setAttribute("stroke", mutedColor)
    })

    const texts = svgElement.querySelectorAll("text")
    texts.forEach((text) => {
      text.setAttribute("font-family", "Arial, Helvetica, sans-serif")
      if (text.classList.contains("fill-foreground")) text.setAttribute("fill", textColor)
      if (text.classList.contains("fill-muted-foreground")) text.setAttribute("fill", mutedColor)

      const currentFontSize = text.getAttribute("fontSize") || text.style.fontSize
      if (currentFontSize) {
        text.setAttribute("font-size", currentFontSize)
      } else {
        if (text.classList.contains("text-[8px]")) text.setAttribute("font-size", "8px")
        else if (text.classList.contains("text-sm")) text.setAttribute("font-size", "14px")
        else {
          const fontSizeAttr = text.getAttribute("fontSize")
          if (fontSizeAttr) text.setAttribute("font-size", fontSizeAttr + "px")
        }
      }
      if (text.classList.contains("font-semibold")) text.setAttribute("font-weight", "600")
      else if (text.classList.contains("font-normal")) text.setAttribute("font-weight", "400")
    })

    const rects = svgElement.querySelectorAll("rect")
    rects.forEach((rect) => {
      if (rect.getAttribute("fill") === "hsl(var(--background))") rect.setAttribute("fill", backgroundColor)
      if (rect.getAttribute("stroke") === "hsl(var(--border))") rect.setAttribute("stroke", borderColor)
    })

    // Add background rect for SVG export if it's not for PNG conversion
    // const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
    // backgroundRect.setAttribute("width", "100%") // Use relative width for viewBox
    // backgroundRect.setAttribute("height", "100%") // Use relative height for viewBox
    // backgroundRect.setAttribute("fill", backgroundColor)
    // // Adjust x,y if viewBox starts from negative values
    // const viewBox = svgElement.getAttribute("viewBox")?.split(" ").map(Number)
    // if (viewBox && viewBox.length === 4) {
    //   backgroundRect.setAttribute("x", viewBox[0].toString())
    //   backgroundRect.setAttribute("y", viewBox[1].toString())
    //   backgroundRect.setAttribute("width", viewBox[2].toString())
    //   backgroundRect.setAttribute("height", viewBox[3].toString())
    // } else {
    //   // fallback if viewBox is not as expected
    //   backgroundRect.setAttribute("width", "900")
    //   backgroundRect.setAttribute("height", "360")
    // }
    // svgElement.insertBefore(backgroundRect, svgElement.firstChild)

    return new XMLSerializer().serializeToString(svgElement)
  }

  const copyChartAsPNG = async () => {
    setCopyStatus("copying")
    const svgString = prepareSvgForExport()
    if (!svgString) {
      setCopyStatus("error")
      setTimeout(() => setCopyStatus("idle"), 3000)
      return
    }

    try {
      if (isElectron) {
        // Use Electron's clipboard API
        await window.electronAPI.copyImageToClipboard(svgString)
        setCopyStatus("success")
        setTimeout(() => setCopyStatus("idle"), 2000)
      } else {
        // Fallback to web clipboard API
        const isDarkMode = document.documentElement.classList.contains("dark")
        const backgroundColor = isDarkMode ? "#0f0f0f" : "#ffffff"

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          setCopyStatus("error")
          setTimeout(() => setCopyStatus("idle"), 3000)
          return
        }

        const scale = 3
        canvas.width = 800 * scale
        canvas.height = 360 * scale

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.scale(scale, scale)
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, 800, 360)

        const img = new Image()
        img.crossOrigin = "anonymous"
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
        const url = URL.createObjectURL(svgBlob)

        img.onload = async () => {
          ctx.drawImage(img, 0, 0, 800, 360)
          URL.revokeObjectURL(url)
          canvas.toBlob(
            async (blob) => {
              if (blob) {
                try {
                  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
                  setCopyStatus("success")
                  setTimeout(() => setCopyStatus("idle"), 2000)
                } catch (err) {
                  console.error("Failed to copy PNG to clipboard:", err)
                  setCopyStatus("error")
                  setTimeout(() => setCopyStatus("idle"), 3000)
                }
              } else {
                setCopyStatus("error")
                setTimeout(() => setCopyStatus("idle"), 3000)
              }
            },
            "image/png",
            1.0,
          )
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          setCopyStatus("error")
          setTimeout(() => setCopyStatus("idle"), 3000)
        }
        img.src = url
      }
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      setCopyStatus("error")
      setTimeout(() => setCopyStatus("idle"), 3000)
    }
  }

  const copyChartAsSVG = async () => {
    setCopyStatus("copying")
    const svgString = prepareSvgForExport()
    if (!svgString) {
      setCopyStatus("error")
      setTimeout(() => setCopyStatus("idle"), 3000)
      return
    }

    try {
      if (isElectron) {
        await window.electronAPI.copyTextToClipboard(svgString)
      } else {
        await navigator.clipboard.writeText(svgString)
      }
      setCopyStatus("success")
      setTimeout(() => setCopyStatus("idle"), 2000)
    } catch (err) {
      console.error("Failed to copy SVG to clipboard:", err)
      setCopyStatus("error")
      setTimeout(() => setCopyStatus("idle"), 3000)
    }
  }

  const downloadChartAsPNG = async () => {
    // This function can now also use prepareSvgForExport and the canvas logic from copyChartAsPNG
    // For brevity, assuming it's similar to copyChartAsPNG but triggers download
    const svgString = prepareSvgForExport()
    if (!svgString) return

    const now = new Date()
    const timestamp = now.toISOString().replace(/:/g, "-").replace(/\..+/, "").replace("T", "_")
    const filename = `${currentCollection?.name || "hill-chart"}_${timestamp}.png`

    if (isElectron) {
      // Use Electron's save dialog
      await window.electronAPI.saveImageFile(svgString, filename)
    } else {
      // Fallback to web download
      const isDarkMode = document.documentElement.classList.contains("dark")
      const backgroundColor = isDarkMode ? "#0f0f0f" : "#ffffff"

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const scale = 3
      canvas.width = 800 * scale
      canvas.height = 360 * scale
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.scale(scale, scale)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, 800, 360)

      const img = new Image()
      img.crossOrigin = "anonymous"
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(svgBlob)

      img.onload = () => {
        ctx.drawImage(img, 0, 0, 800, 360)
        URL.revokeObjectURL(url)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const link = document.createElement("a")
              link.download = filename
              link.href = URL.createObjectURL(blob)
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(link.href)
            }
          },
          "image/png",
          1.0,
        )
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        console.error("Failed to load SVG for PNG download")
      }
      img.src = url
    }
  }

  const downloadChartAsSVG = async () => {
    const svgString = prepareSvgForExport()
    if (!svgString) return

    const now = new Date()
    const timestamp = now.toISOString().replace(/:/g, "-").replace(/\..+/, "").replace("T", "_")
    const filename = `${currentCollection?.name || "hill-chart"}_${timestamp}.svg`

    if (isElectron) {
      // Use Electron's save dialog
      await window.electronAPI.saveTextFile(svgString, filename)
    } else {
      // Fallback to web download
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
      const url = URL.createObjectURL(svgBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const handleCopyToClipboard = () => {
    if (copyFormat === "PNG") {
      copyChartAsPNG()
    } else if (copyFormat === "SVG") {
      copyChartAsSVG()
    }
  }

  const exportCollections = async () => {
    const exportData: ExportData = {
      collections,
      snapshots,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `hill-chart-data_${new Date().toLocaleDateString('sv-SE')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowEllipsisMenu(false)
  }

  const importCollections = async (event?: React.ChangeEvent<HTMLInputElement>) => {
    try {
      let importedData = null

      if (isElectron) {
        // Use Electron's open dialog
        importedData = await window.electronAPI.openFile()
        if (!importedData) return // User cancelled
      } else {
        // Fallback to web file input
        const file = event?.target?.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string)
            processImportedData(data)
          } catch (error) {
            alert("Invalid JSON file")
          }
        }
        reader.readAsText(file)
        // Reset the input value so the same file can be selected again
        if (event?.target) event.target.value = ""
        return
      }

      processImportedData(importedData)
    } catch (error) {
      console.error("Import error:", error)
      alert("Failed to import file. Please check the file and try again.")
    }
    setShowEllipsisMenu(false)
  }

  const processImportedData = (importedData: any) => {
    try {
      // Check if it's the new format with collections and snapshots
      if (importedData.collections && Array.isArray(importedData.collections)) {
        // New format with snapshots
        setCollections(importedData.collections)

        // Import snapshots if they exist
        if (importedData.snapshots && Array.isArray(importedData.snapshots)) {
          setSnapshots(importedData.snapshots)
        } else {
          setSnapshots([]) // Clear existing snapshots if none in import
        }

        // Set the first collection as selected
        if (importedData.collections.length > 0) {
          setSelectedCollection(importedData.collections[0].id)
          setCollectionInput(importedData.collections[0].name)
        }
      } else if (Array.isArray(importedData)) {
        // Legacy format - just collections array
        setCollections(importedData)
        setSnapshots([]) // Clear snapshots for legacy imports

        if (importedData.length > 0) {
          setSelectedCollection(importedData[0].id)
          setCollectionInput(importedData[0].name)
        }
      } else {
        alert("Invalid file format. Please select a valid Hill Chart data file.")
        return
      }

      // Clear selected snapshot since we're loading new data
      setSelectedSnapshot(null)

      alert(
        `Successfully imported ${importedData.collections?.length || importedData.length || 0} collections${importedData.snapshots ? ` and ${importedData.snapshots.length} snapshots` : ""}.`,
      )
    } catch (error) {
      console.error("Import error:", error)
      alert("Invalid file format or corrupted data. Please check the file and try again.")
    }
  }

  const getCopyButtonContent = () => {
    switch (copyStatus) {
      case "copying":
        return (
          <>
            <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Copying...
          </>
        )
      case "success":
        return (
          <>
            <Check className="w-4 h-4 mr-1" />
            Copied as {copyFormat}!
          </>
        )
      case "error":
        return (
          <>
            <CopyIcon className="w-4 h-4 mr-1" />
            Try Again
          </>
        )
      default:
        return (
          <>
            <CopyIcon className="w-4 h-4 mr-1" />
            Copy as {copyFormat}
          </>
        )
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCollectionInput(e.target.value)
    setIsTyping(true)
    setShowDropdown(true) // Open dropdown immediately when typing
  }

  const handleCollectionInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault() // Prevent form submission
      if (collectionInput.trim()) {
        // Check if the collection already exists
        if (!collections.some((c) => c.name.toLowerCase() === collectionInput.toLowerCase())) {
          const newCollection: Collection = {
            id: Date.now().toString(),
            name: collectionInput,
            dots: [],
          }
          setCollections([...collections, newCollection])
          setSelectedCollection(newCollection.id)
        }
        setShowDropdown(false)
        setIsTyping(false)
      }
    }
  }

  const handleInputFocus = () => {
    setFilteredCollections(collections) // Show all collections when focused
    setShowDropdown(true)
  }

  const toggleDropdown = () => {
    if (!showDropdown) {
      // When opening dropdown, clear input and show all collections
      setCollectionInput("")
      setFilteredCollections(collections)
    }
    setShowDropdown(!showDropdown)
    setIsTyping(false) // Reset typing state when dropdown is toggled via button
  }

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection.id)
    setCollectionInput(collection.name)
    setShowDropdown(false)
    setIsTyping(false)
    setSelectedSnapshot(null) // Clear snapshot selection when switching collections
    setFilteredCollections(collections) // Reset filtered collections
  }

  const updateDotLabel = (dotId: string, newLabel: string) => {
    setCollections((prev) =>
      prev.map((collection) => ({
        ...collection,
        dots: collection.dots.map((dot) => (dot.id === dotId ? { ...dot, label: newLabel } : dot)),
      })),
    )
  }

  const updateDotColor = (dotId: string, newColor: string) => {
    setCollections((prev) =>
      prev.map((collection) => ({
        ...collection,
        dots: collection.dots.map((dot) => (dot.id === dotId ? { ...dot, color: newColor } : dot)),
      })),
    )
  }

  const updateDotSize = (dotId: string, newSize: number) => {
    setCollections((prev) =>
      prev.map((collection) => ({
        ...collection,
        dots: collection.dots.map((dot) => (dot.id === dotId ? { ...dot, size: newSize } : dot)),
      })),
    )
  }

  // Add functions for editing (after other handlers)
  const startEditCollection = (collection: Collection) => {
    setIsEditingCollection(true)
    setEditingCollectionName(collection.name)
    setEditingCollectionId(collection.id)
    setShowDropdown(false)
  }

  const saveCollectionEdit = () => {
    if (!editingCollectionId || !editingCollectionName.trim()) {
      cancelCollectionEdit()
      return
    }

    const trimmedName = editingCollectionName.trim()
    
    // Check for duplicate names
    const isDuplicate = collections.some(
      c => c.id !== editingCollectionId && c.name.toLowerCase() === trimmedName.toLowerCase()
    )
    
    if (isDuplicate) {
      console.error("Collection name already exists")
      cancelCollectionEdit()
      return
    }

    // Update local state
    setCollections(prev => 
      prev.map(c => 
        c.id === editingCollectionId 
          ? { ...c, name: trimmedName }
          : c
      )
    )
    setCollectionInput(trimmedName)

    setIsEditingCollection(false)
    setEditingCollectionName("")
    setEditingCollectionId(null)
  }

  const cancelCollectionEdit = () => {
    setIsEditingCollection(false)
    setEditingCollectionName("")
    setEditingCollectionId(null)
  }

  const handleEditKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveCollectionEdit()
    } else if (e.key === "Escape") {
      cancelCollectionEdit()
    }
  }

  // Load platform information
  const loadPlatform = async () => {
    if (isElectron) {
      try {
        const platformInfo = await window.electronAPI.getPlatform()
        setPlatform(platformInfo)
      } catch (error) {
        console.error("Error loading platform:", error)
      }
    }
  }

  // Handle installation
  const handleInstallApp = async () => {
    if (!isElectron || platform !== 'linux') return
    
    setInstallStatus("installing")
    setShowInstallConfirm(false)
    
    try {
      const result = await window.electronAPI.installApp()
      if (result.success) {
        setInstallStatus("success")
        setInstallMessage(result.message)
        setTimeout(() => {
          setInstallStatus("idle")
          setInstallMessage("")
        }, 3000)
      } else {
        throw new Error("Installation failed")
      }
    } catch (error) {
      console.error("Installation error:", error)
      setInstallStatus("error")
      setInstallMessage("Failed to install app. Please try again.")
      setTimeout(() => {
        setInstallStatus("idle")
        setInstallMessage("")
      }, 3000)
    }
  }

  // Add handleTipClick (after other handlers, around line 800)
  const handleTipClick = () => {
    const paypalLink = 'https://paypal.me/gfaurobert'
    window.open(paypalLink, '_blank')
    setShowEllipsisMenu(false)
  }

  return (
    <div className="min-h-screen p-4 bg-transparent" style={{ userSelect: isDragging ? "none" : "auto" }}>
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-[2.4fr_1.2fr] gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadChartAsPNG}>
                  <Download className="w-4 h-4 mr-1" />
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={downloadChartAsSVG}>
                  <Download className="w-4 h-4 mr-1" />
                  SVG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  disabled={copyStatus === "copying"}
                  className={`transition-colors ${
                    copyStatus === "success"
                      ? "border-green-500 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:border-green-400 dark:bg-green-400/10 dark:text-green-400 dark:hover:bg-green-400/20"
                      : copyStatus === "error"
                        ? "border-red-500 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:border-red-400 dark:bg-red-400/10 dark:text-red-400 dark:hover:bg-red-400/20"
                        : ""
                  }`}
                >
                  {getCopyButtonContent()}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <div className="relative w-full h-96 bg-background -m-2 flex items-center justify-center">
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  viewBox="-50 0 700 180" // Adjusted viewBox for padding
                  className="overflow-visible max-w-full"
                  style={{ userSelect: "none" }}
                  onMouseMove={(e) => {
                    if (isDragging) {
                      handleDotDrag(isDragging, e.clientX, e.clientY)
                    }
                  }}
                  onMouseUp={() => {
                    setIsDragging(null)
                    setDraggingDot(null)
                  }}
                >
                  {/* Bell curve */}
                  <path
                    className="bg-transparent shadow-none leading-9"
                    d={generateBellCurvePath(600, 150, 300)}
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                  />

                  {/* Base line */}
                  <line className="leading-3" x1="0" y1="150" x2="600" y2="150" stroke="currentColor" strokeWidth="1" />

                  {/* Center divider */}
                  <line
                    x1="300"
                    y1="-5"
                    x2="300"
                    y2="150"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                  />

                  {/* Labels */}
                  <text
                    x="30"
                    y="160"
                    textAnchor="middle"
                    className="text-[8px] fill-muted-foreground font-normal leading-4"
                  >
                    Discovery
                  </text>
                  {!hideCollectionName && (
                    <text x="300" y="175" textAnchor="middle" className="font-semibold text-sm fill-foreground">
                      {currentCollection?.name}
                    </text>
                  )}
                  <text x="570" y="160" textAnchor="middle" className="text-[8px] fill-muted-foreground">
                    Delivery
                  </text>

                  {/* Dots */}
                  {currentCollection?.dots.map((dot) => {
                    const dotX = (dot.x / 100) * 600
                    const dotRadius = 4 + dot.size * 2 // Size 1 = 6px radius, Size 5 = 14px radius
                    const fontSize = 8 + dot.size * 1 // Size 1 = 9px, Size 5 = 13px
                    const textWidth = dot.label.length * (fontSize * 0.6) + 16
                    const textHeight = fontSize + 12

                    const isBeingDragged = draggingDot?.id === dot.id
                    const displayX = isBeingDragged ? (draggingDot.x / 100) * 600 : dotX
                    const displayY = isBeingDragged ? draggingDot.y : dot.y

                    return (
                      <g key={dot.id}>
                        <circle
                          cx={displayX}
                          cy={displayY}
                          r={dotRadius}
                          fill={dot.color}
                          stroke="#fff"
                          strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-all"
                          onMouseDown={() => setIsDragging(dot.id)}
                        />
                        <rect
                          x={displayX - textWidth / 2}
                          y={displayY - 35}
                          width={textWidth}
                          height={textHeight}
                          rx="8"
                          ry="8"
                          fill="hsl(var(--background))"
                          stroke="hsl(var(--border))"
                          strokeWidth="1"
                          className="pointer-events-none"
                        />
                        <text
                          x={displayX}
                          y={displayY - 35 + textHeight / 2}
                          textAnchor="middle"
                          className="fill-foreground pointer-events-none select-none"
                          dominantBaseline="central"
                          fontSize={fontSize}
                          style={{ userSelect: "none" }}
                        >
                          {dot.label}
                        </text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col">
                <CardTitle className="text-lg">Over The Hill</CardTitle>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm text-muted-foreground">
                    Inspired by{" "}
                    <a
                      href="https://37signals.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      37signals
                    </a>{" "}
                    Hill Chart
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInfoModal(true)}
                    className="h-4 w-4 p-0 hover:bg-accent rounded-full"
                  >
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="relative" ref={ellipsisMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEllipsisMenu(!showEllipsisMenu)}
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>

                {showEllipsisMenu && (
                  <div className="absolute right-0 top-8 w-56 bg-background border border-border rounded-md shadow-lg z-50">
                    <div className="py-1">
                      {/* Theme Section */}
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                        Theme
                      </div>
                      <button
                        onClick={() => {
                          setTheme("light")
                          setShowEllipsisMenu(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <Sun className="w-4 h-4" /> Light {theme === "light" && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          setTheme("dark")
                          setShowEllipsisMenu(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <Moon className="w-4 h-4" /> Dark {theme === "dark" && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          setTheme("system")
                          setShowEllipsisMenu(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <Monitor className="w-4 h-4" /> Follow Browser{" "}
                        {theme === "system" && <Check className="w-4 h-4 ml-auto" />}
                      </button>

                      {/* Export Section */}
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                        Export Clipboard Format
                      </div>
                      <button
                        onClick={() => {
                          setCopyFormat("PNG")
                          setShowEllipsisMenu(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <FileImage className="w-4 h-4" /> Copy as PNG{" "}
                        {copyFormat === "PNG" && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          setCopyFormat("SVG")
                          setShowEllipsisMenu(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <FileCode2 className="w-4 h-4" /> Copy as SVG{" "}
                        {copyFormat === "SVG" && <Check className="w-4 h-4 ml-auto" />}
                      </button>

                      {/* Chart Settings Section */}
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                        Chart Settings
                      </div>
                      <button
                        onClick={() => {
                          setHideCollectionName(!hideCollectionName)
                          setShowEllipsisMenu(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <Monitor className="w-4 h-4" /> Hide Collection Name{" "}
                        {hideCollectionName && <Check className="w-4 h-4 ml-auto" />}
                      </button>
                      <button
                        onClick={() => {
                          setShowResetConfirm(true)
                          setShowEllipsisMenu(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Reset Collections
                      </button>

                      {/* Collections Section */}
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                        Collections
                      </div>
                      <button
                        onClick={exportCollections}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <DownloadIcon className="w-4 h-4" /> Export Collections
                      </button>
                      {isElectron ? (
                        <button
                          onClick={() => importCollections()}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          <UploadIcon className="w-4 h-4" /> Import Collections
                        </button>
                      ) : (
                        <label className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer">
                          <UploadIcon className="w-4 h-4" /> Import Collections
                          <input type="file" accept=".json" onChange={importCollections} className="hidden" />
                        </label>
                      )}

                      {/* Storage Location Section (Electron only) */}
                      {isElectron && (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                            Storage Location
                          </div>
                          <button
                            onClick={() => {
                              setShowStorageLocationModal(true)
                              setShowEllipsisMenu(false)
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                          >
                            <FolderOpen className="w-4 h-4" /> Change Storage Location
                          </button>
                          <div className="px-3 py-1 text-xs text-muted-foreground truncate">
                            {storageLocation}
                          </div>
                        </>
                      )}

                      {/* Installation Section (Linux only) */}
                      {isElectron && platform === 'linux' && (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                            System Integration
                          </div>
                          <button
                            onClick={() => {
                              setShowInstallConfirm(true)
                              setShowEllipsisMenu(false)
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" /> Install on my system
                          </button>
                        </>
                      )}

                      {/* Support Section */}
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                        Support
                      </div>
                      <button
                        onClick={handleTipClick}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                      >
                        <Heart className="w-4 h-4" /> Send Tip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative" ref={dropdownRef}>
                <label className="text-sm font-medium mb-2 block">Collections</label>
                <div className="relative">
                  {isEditingCollection ? (
                    <Input
                      ref={editInputRef}
                      value={editingCollectionName}
                      onChange={(e) => setEditingCollectionName(e.target.value)}
                      onKeyDown={handleEditKeyPress}
                      onBlur={saveCollectionEdit}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  ) : (
                    <Input
                      ref={inputRef}
                      value={collectionInput}
                      onChange={handleInputChange}
                      onKeyPress={handleCollectionInputKeyPress}
                      onFocus={handleInputFocus}
                      placeholder="Type to search or create collection..."
                      className="pr-8"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2"
                    onClick={toggleDropdown}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                {showDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCollections.length > 0 ? (
                      filteredCollections.map((collection) => (
                        <div
                          key={collection.id}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm flex items-center justify-between"
                          onClick={() => handleCollectionSelect(collection)}
                        >
                          {collection.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditCollection(collection)
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No collections found</div>
                    )}

                    {collectionInput.trim() &&
                      !collections.some((c) => c.name.toLowerCase() === collectionInput.toLowerCase()) && (
                        <div className="border-t border-border">
                          <div className="px-3 py-2 text-sm text-primary bg-primary/10">
                            Press Enter to create "{collectionInput}"
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Snapshot Calendar */}
              <div className="space-y-2">
                <label className="text-sm font-medium block">Snapshots</label>
                {renderCalendar()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Dots</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCollections((prev) =>
                    prev.map((collection) =>
                      collection.id === selectedCollection
                        ? {
                            ...collection,
                            dots: [...collection.dots].sort((a, b) => b.x - a.x), // Sort by completion percentage (x position) descending
                          }
                        : collection,
                    ),
                  )
                }}
                className="h-8 w-8 p-0"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter dot name and press Enter to add..."
                value={newDotLabel}
                onChange={(e) => setNewDotLabel(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addDot()}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {currentCollection?.dots.map((dot) => (
                  <div key={dot.id} className="p-3 bg-muted/50 rounded-lg space-y-3">
                    {/* Dot Name and Controls Row */}
                    <div className="flex items-center gap-2">
                      {/* Dot Name Input - takes remaining space */}
                      <Input
                        value={dot.label}
                        onChange={(e) => updateDotLabel(dot.id, e.target.value)}
                        className="text-sm flex-1"
                        placeholder="Dot name"
                      />

                      {/* Color Dropdown */}
                      <Select value={dot.color} onValueChange={(value) => updateDotColor(dot.id, value)}>
                        <SelectTrigger className="w-12 h-8 p-0 border-0 bg-transparent">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-gray-300"
                            style={{ backgroundColor: dot.color }}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultColors.map((color, index) => (
                            <SelectItem key={color} value={color}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full border border-gray-300"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-sm">{["Blue", "Green", "Red", "Orange", "Purple"][index]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Size Dropdown */}
                      <Select
                        value={dot.size.toString()}
                        onValueChange={(value) => updateDotSize(dot.id, Number.parseInt(value))}
                      >
                        <SelectTrigger className="w-12 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{size}</span>
                                <span className="text-xs text-gray-500">{["XS", "S", "M", "L", "XL"][size - 1]}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Delete Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => showDeleteConfirm(dot.id, dot.label)}
                        className="h-8 w-8 p-0 border-red-200 hover:border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Dot</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete "{deleteConfirm.dotLabel}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Collections Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Reset All Collections</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete all collections and snapshots? This action cannot be undone and will
              remove all your data.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setCollections([])
                  setSnapshots([])
                  setSelectedCollection("")
                  setCollectionInput("")
                  setSelectedSnapshot(null)
                  setShowResetConfirm(false)
                  // Clear storage
                  if (isElectron) {
                    window.electronAPI.clearData()
                  } else {
                    localStorage.removeItem("hill-chart-collections")
                    localStorage.removeItem("hill-chart-snapshots")
                    localStorage.removeItem("hill-chart-selected-collection")
                    localStorage.removeItem("hill-chart-collection-input")
                  }
                }}
              >
                Reset All
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">About Hill Charts</h3>
            <div className="text-gray-600 dark:text-gray-300 space-y-3">
              <p>
                <a
                  href="https://37signals.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  37signals
                </a>{" "}
                Hill Charts are a great way to visually communicate progress and incoming work.
              </p>
              <p>
                Read{" "}
                <a
                  href="https://basecamp.com/shapeup/3.4-chapter-13"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Shape Up: Show Progress (Chapt. 13)
                </a>{" "}
                to discover the technique.
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setShowInfoModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Storage Location Modal */}
      {showStorageLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Change Storage Location</h3>
            <div className="text-gray-600 dark:text-gray-300 space-y-3">
              <p>
                Choose where to store your hill chart data. The data will be moved to the new location.
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <strong>Current location:</strong>
                <div className="truncate mt-1">{storageLocation}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowStorageLocationModal(false)}>
                Cancel
              </Button>
              <Button onClick={selectStorageLocation}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Select New Location
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Installation Confirmation Modal */}
      {showInstallConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Install on System</h3>
            <div className="text-gray-600 dark:text-gray-300 space-y-3">
              <p>
                This will install Over The Hill on your system by:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Copying the AppImage to <code className="bg-muted px-1 rounded">~/.local/bin/over-the-hill/Over-The-Hill-1.0.0.AppImage</code></li>
                <li>Copying the icon to <code className="bg-muted px-1 rounded">~/.local/bin/over-the-hill/OverTheHill.svg</code></li>
                <li>Creating a desktop entry in <code className="bg-muted px-1 rounded">~/.local/share/applications/</code></li>
                <li>Making the app available in your system menu</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                The app will be launched with the <code className="bg-muted px-1 rounded">--no-sandbox</code> flag for better Linux compatibility.
              </p>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowInstallConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleInstallApp} disabled={installStatus === "installing"}>
                {installStatus === "installing" ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Install
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Installation Status Messages */}
      {installStatus === "success" && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {installMessage}
        </div>
      )}
      {installStatus === "error" && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {installMessage}
        </div>
      )}
    </div>
  )
}
