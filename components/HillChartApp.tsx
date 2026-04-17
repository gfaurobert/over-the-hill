"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import ReactDOM from "react-dom"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
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
  Heart, // Add Heart icon import
  Edit2,
  X,
  Archive as ArchiveIcon,
  Undo2,
  Shield,
  Rocket,
  Flag,
  Palette,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Switch } from "./ui/switch"
import { useTheme } from "next-themes"
import SignOutButton from "./SignOutButton"
import { useAuth } from "./AuthProvider"
import { PrivacySettings } from "./PrivacySettings"
import { CacheStatusBadge } from "./CacheStatusBadge"
import { ReleaseLineSettings } from "./ReleaseLineSettings"
import {
  fetchCollections,
  addCollection,
  updateCollection,
  archiveCollection,
  unarchiveCollection,
  deleteCollection,
  addDot as addDotService,
  updateDot as updateDotService,
  deleteDot as deleteDotService,
  importData,
  createSnapshot,
  fetchSnapshots,
  loadSnapshot,
  resetAllCollections,
  fetchUserPreferences,
  updateUserPreferences,
  updateCollectionReleaseLineConfig,
  getCollectionReleaseLineConfig,
} from "@/lib/services/simpleDataService"
import {
  getCollectionSeverity,
  sortCollectionsBySeverity,
  type CollectionSeverity,
} from "@/lib/utils/collectionSeverity"
import { cn } from "@/lib/utils"

export interface Dot {
  id: string
  label: string
  x: number
  y: number
  color: string
  size: number
  archived: boolean // always present
  flag_for_today?: boolean
}

export interface ReleaseLineConfig {
  enabled: boolean
  color: string
  text: string
}

export interface Collection {
  id: string
  name: string
  status: 'active' | 'archived' | 'deleted'
  archived_at?: string
  deleted_at?: string
  created_at?: string
  dots: Dot[]
  releaseLineConfig?: ReleaseLineConfig
}

export interface Snapshot {
  date: string
  collectionId: string
  collectionName: string
  dots: Dot[]
  timestamp: number
  releaseLineConfig?: ReleaseLineConfig
}

export interface ExportData {
  collections: Collection[]
  snapshots: Snapshot[]
  exportDate: string
  version: string
}

interface DotColorPreferences {
  discovery: string
  upslope: string
  dangerZone: string
  downslope: string
  done: string
}

const defaultDotColors: DotColorPreferences = {
  discovery: "#b0cdfb",
  upslope: "#a6e7be",
  dangerZone: "#f8b4b4",
  downslope: "#fcc7a1",
  done: "#d0bdfb",
}
const dotColorLabels = ["Discovery", "On Track", "Blocked", "At Risk", "Done"]
const defaultLightGradientStart = "#f8fafc"
const defaultLightGradientEnd = "#e2e8f0"
const defaultDarkGradientStart = "#0f172a"
const defaultDarkGradientEnd = "#1e293b"
const TODAY_COLLECTION_NAME = "Today"
const SIDEBAR_COLLECTIONS_PER_PAGE = 12
const DOTS_PER_PAGE = 10

// Helper function to get local date string in YYYY-MM-DD format (consistent with backend)
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const generateBellCurvePath = (width = 600, height = 150, centerX = 300) => {
  const points: string[] = []
  const startX = centerX - width / 2
  const endX = centerX + width / 2
  const baseY = 145
  for (let x = startX; x <= endX; x += 5) {
    const normalizedX = (x - centerX) / (width / 6)
    const y = baseY - height * Math.exp(-0.5 * normalizedX * normalizedX)
    points.push(`${x === startX ? "M" : "L"} ${x} ${y}`)
  }
  return points.join(" ")
}

function DotMenuPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return null
  return ReactDOM.createPortal(children, document.body)
}

function DotMenuDropdown({ anchorRef, onClose, onDelete, onArchive }: {
  anchorRef: React.RefObject<HTMLDivElement | null>,
  onClose: () => void,
  onDelete: () => void,
  onArchive: () => void,
}) {
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)

  React.useEffect(() => {
    function updatePosition() {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect()
        setPosition({
          top: rect.bottom + window.scrollY,
          left: rect.right - 160 + window.scrollX, // 160px = min width
        })
      }
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [anchorRef])

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose, anchorRef])

  if (!position) return null
  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        minWidth: 160,
      }}
      className="bg-background border border-border rounded shadow-lg"
    >
      <button
        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4 text-red-500" /> Delete
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
        onClick={onArchive}
      >
        <ArchiveIcon className="w-4 h-4 text-muted-foreground" /> Archive
      </button>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DotRow({ dot, dotMenuOpen, setDotMenuOpen, setDeleteConfirm, updateDot, editingDotId, setEditingDotId }: any) {
  const menuButtonRef = React.useRef<HTMLDivElement>(null)
  return (
    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
      {/* Dot Name and Controls Row */}
      <div className="flex items-center gap-2">
        <Input
          value={dot.label}
          onChange={(e) => {
            if (e.target.value.length <= 24) {
              updateDot(dot.id, { label: e.target.value })
            }
          }}
          onFocus={() => setEditingDotId(dot.id)}
          onBlur={() => setEditingDotId(null)}
          className="text-sm flex-1"
          placeholder="Dot name"
          maxLength={24}
        />
        <Select
          value={dot.color}
          onValueChange={(value) => updateDot(dot.id, { color: value })}
        >
          <SelectTrigger className="w-12 h-8 p-0 border-0 bg-transparent">
            <div
              className="w-6 h-6 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: dot.color }}
            />
          </SelectTrigger>
          <SelectContent>
            {Object.values(defaultDotColors).map((color, index) => (
              <SelectItem key={color} value={color}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">
                    {dotColorLabels[index]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={dot.size.toString()}
          onValueChange={(value) => updateDot(dot.id, { size: Number(value) })}
        >
          <SelectTrigger className="w-12 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((size) => (
              <SelectItem key={size} value={size.toString()}>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{size}</span>
                  <span className="text-xs text-gray-500">
                    {['XS', 'S', 'M', 'L', 'XL'][size - 1]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative" ref={menuButtonRef}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDotMenuOpen(dotMenuOpen === dot.id ? null : dot.id)}
            className="h-8 w-8 p-0 border-muted hover:border-accent hover:bg-accent/20"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </Button>
          {dotMenuOpen === dot.id && (
            <DotMenuPortal>
              <DotMenuDropdown
                anchorRef={menuButtonRef}
                onClose={() => setDotMenuOpen(null)}
                onDelete={() => {
                  setDotMenuOpen(null)
                  setDeleteConfirm({ dotId: dot.id, dotLabel: dot.label })
                }}
                onArchive={async () => {
                  setDotMenuOpen(null)
                  await updateDot(dot.id, { archived: true })
                }}
              />
            </DotMenuPortal>
          )}
        </div>
      </div>
      {dot.label.length === 24 && editingDotId === dot.id && (
        <div className="text-xs text-red-500 mt-1">Dot name cannot exceed 24 characters.</div>
      )}
    </div>
  )
}

const HillChartApp: React.FC<{ onResetPassword: () => void }> = ({ onResetPassword }) => {
  const getHillY = (x: number) => {
    const centerX = 300,
      width = 600,
      height = 150,
      baseY = 145
    const svgX = (x / 100) * width
    const normalizedX = (svgX - centerX) / (width / 6)
    return baseY - height * Math.exp(-0.5 * normalizedX * normalizedX)
  }

  const [collections, setCollections] = useState<Collection[]>([])
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [isLoadingCollections, setIsLoadingCollections] = useState(false)
  const [newDotLabel, setNewDotLabel] = useState("")
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [collectionInput, setCollectionInput] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ dotId: string; dotLabel: string } | null>(null)
  const [selectedDotIds, setSelectedDotIds] = useState<string[]>([])
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<{ dotIds: string[]; count: number } | null>(null)
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [gradientStartColor, setGradientStartColor] = useState(defaultLightGradientStart)
  const [gradientEndColor, setGradientEndColor] = useState(defaultLightGradientEnd)
  const [dotColors, setDotColors] = useState<DotColorPreferences>(defaultDotColors)
  const previousDotColorsRef = useRef<DotColorPreferences>(defaultDotColors)
  const hasInitializedDotColorSyncRef = useRef(false)
  const [hasCustomGradientColors, setHasCustomGradientColors] = useState(false)
  const [isSplitHillAreaFillEnabled, setIsSplitHillAreaFillEnabled] = useState(false)
  const [hasHydratedUserPreferences, setHasHydratedUserPreferences] = useState(false)
  const ellipsisMenuRef = useRef<HTMLDivElement>(null)
  const settingsModalRef = useRef<HTMLDivElement>(null)

  // Add click-outside-to-close behavior for main ellipsis menu
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (settingsModalRef.current?.contains(target)) return
      if (
        ellipsisMenuRef.current &&
        !ellipsisMenuRef.current.contains(target)
      ) {
        setShowEllipsisMenu(false)
      }
    }
    if (showEllipsisMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showEllipsisMenu])
  const svgRef = useRef<SVGSVGElement>(null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "success" | "error">("idle")
  const [copyFormat, setCopyFormat] = useState<"PNG" | "SVG">("PNG")
  const [hideCollectionName, setHideCollectionName] = useState(false)
  const [showTodayCollection, setShowTodayCollection] = useState(true)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const { user } = useAuth()
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null)
  const [draggingDot, setDraggingDot] = useState<{ id: string; x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null)

  // Snapshot state management
  const [isViewingSnapshot, setIsViewingSnapshot] = useState(false)
  const [currentSnapshot, setCurrentSnapshot] = useState<Snapshot | null>(null)
  const [snapshotCollections, setSnapshotCollections] = useState<Collection[]>([])
  const [originalCollections, setOriginalCollections] = useState<Collection[]>([])
  const [snapshotSuccess, setSnapshotSuccess] = useState(false)

  // Archive management state
  const [archivedCollections, setArchivedCollections] = useState<Collection[]>([])
  const [archiveConfirm, setArchiveConfirm] = useState<{ collectionId: string; collectionName: string } | null>(null)
  const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState<{ collectionId: string; collectionName: string } | null>(null)
  const [collectionNameConflict, setCollectionNameConflict] = useState<{
    name: string;
    type: 'active' | 'archived';
    archivedCollectionId?: string
  } | null>(null)
  const [showArchivedCollectionsModal, setShowArchivedCollectionsModal] = useState(false)
  const [showPrivacySettings, setShowPrivacySettings] = useState(false)
  const [showColorSettingsModal, setShowColorSettingsModal] = useState(false)
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false)
  const [newCollectionNameInput, setNewCollectionNameInput] = useState("")

  // Collection editing state
  const [isEditingCollection, setIsEditingCollection] = useState(false)
  const [editingCollectionName, setEditingCollectionName] = useState("")
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Add state to track which dot is being edited
  const [editingDotId, setEditingDotId] = useState<string | null>(null)
  const [editingDotLabel, setEditingDotLabel] = useState("")

  const [editingDotPercentId, setEditingDotPercentId] = useState<string | null>(null)
  const [editingDotPercent, setEditingDotPercent] = useState("")

  // Add state to track which dot's menu is open
  const [dotMenuOpen, setDotMenuOpen] = useState<string | null>(null)
  const [collectionActionMenuOpen, setCollectionActionMenuOpen] = useState<string | null>(null)
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("")
  const [collectionPage, setCollectionPage] = useState(1)
  const [dotsPage, setDotsPage] = useState(1)

  // Add state to track import success
  const [showImportSuccess, setShowImportSuccess] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Release line state management
  const [releaseLineSettings, setReleaseLineSettings] = useState<{
    [collectionId: string]: ReleaseLineConfig
  }>({})
  const [isLoadingReleaseLineConfig, setIsLoadingReleaseLineConfig] = useState(false)
  const dotColorOptions = [
    dotColors.discovery,
    dotColors.upslope,
    dotColors.dangerZone,
    dotColors.downslope,
    dotColors.done,
  ]

  // Release line configuration functions
  const loadReleaseLineConfig = useCallback(async (collectionId: string) => {
    if (!user?.id) return

    try {
      setIsLoadingReleaseLineConfig(true)
      const config = await getCollectionReleaseLineConfig(user.id, collectionId)

      if (config) {
        setReleaseLineSettings(prev => ({
          ...prev,
          [collectionId]: config
        }))
      } else {
        // Set default config if none exists
        const defaultConfig: ReleaseLineConfig = {
          enabled: false,
          color: "#ff00ff",
          text: ""
        }
        setReleaseLineSettings(prev => ({
          ...prev,
          [collectionId]: defaultConfig
        }))
      }
    } catch (error) {
      console.error('[HILL_CHART] Failed to load release line config:', error)
      // Set default config on error
      const defaultConfig: ReleaseLineConfig = {
        enabled: false,
        color: "#ff00ff",
        text: ""
      }
      setReleaseLineSettings(prev => ({
        ...prev,
        [collectionId]: defaultConfig
      }))
    } finally {
      setIsLoadingReleaseLineConfig(false)
    }
  }, [user?.id])

  const updateReleaseLineConfig = useCallback(async (collectionId: string, config: ReleaseLineConfig) => {
    if (!user?.id) return

    try {
      // Update local state immediately for real-time updates
      setReleaseLineSettings(prev => ({
        ...prev,
        [collectionId]: config
      }))

      // Persist to database
      const success = await updateCollectionReleaseLineConfig(user.id, collectionId, config)

      if (!success) {
        console.error('[HILL_CHART] Failed to update release line config')
        // Could revert local state here if needed
      }
    } catch (error) {
      console.error('[HILL_CHART] Error updating release line config:', error)
    }
  }, [user?.id])

  const handleReleaseLineConfigChange = useCallback((config: ReleaseLineConfig) => {
    if (selectedCollection) {
      updateReleaseLineConfig(selectedCollection, config)
    }
  }, [selectedCollection, updateReleaseLineConfig])

  useEffect(() => {
    if (user && user.id) {
      console.log('[HILL_CHART] Loading collections for user:', user.id)
      setIsLoadingCollections(true)

      // Fetch active collections with force refresh on login
      fetchCollections(user.id, false).then((activeCollections) => {
        console.log('[HILL_CHART] Loaded active collections:', activeCollections.length)
        const todayCollectionId = `today-${user.id}`
        const hasTodayCollection = activeCollections.some(
          (collection) =>
            collection.id === todayCollectionId || collection.name.toLowerCase() === TODAY_COLLECTION_NAME.toLowerCase(),
        )

        if (hasTodayCollection) {
          setCollections(activeCollections)
          setOriginalCollections(activeCollections)
          if (activeCollections.length > 0 && !selectedCollection) {
            const firstCollection =
              activeCollections.find((collection) => collection.id !== todayCollectionId) || activeCollections[0]
            setSelectedCollection(firstCollection.id)
            setCollectionInput(firstCollection.name)
            // Load release line config for the first collection
            loadReleaseLineConfig(firstCollection.id)
          }
          setIsLoadingCollections(false)
          return
        }

        addCollection(user.id, TODAY_COLLECTION_NAME, todayCollectionId).then((todayCollection) => {
          const collectionsWithToday = todayCollection ? [...activeCollections, todayCollection] : activeCollections
          setCollections(collectionsWithToday)
          setOriginalCollections(collectionsWithToday)
          if (collectionsWithToday.length > 0 && !selectedCollection) {
            const firstCollection =
              collectionsWithToday.find((collection) => collection.id !== todayCollectionId) || collectionsWithToday[0]
            setSelectedCollection(firstCollection.id)
            setCollectionInput(firstCollection.name)
            loadReleaseLineConfig(firstCollection.id)
          }
          setIsLoadingCollections(false)
        }).catch((error) => {
          console.error('[HILL_CHART] Failed to ensure Today collection exists:', error)
          setCollections(activeCollections)
          setOriginalCollections(activeCollections)
          if (activeCollections.length > 0 && !selectedCollection) {
            const firstCollection =
              activeCollections.find((collection) => collection.id !== todayCollectionId) || activeCollections[0]
            setSelectedCollection(firstCollection.id)
            setCollectionInput(firstCollection.name)
            loadReleaseLineConfig(firstCollection.id)
          }
          setIsLoadingCollections(false)
        })
      }).catch((error) => {
        console.error('[HILL_CHART] Failed to fetch active collections:', error)
        setIsLoadingCollections(false)
      })

      // Fetch archived collections with force refresh on login
      fetchCollections(user.id, true).then((allCollections) => {
        const archived = allCollections.filter(c => c.status === 'archived')
        console.log('[HILL_CHART] Loaded archived collections:', archived.length)
        setArchivedCollections(archived)
      }).catch((error) => {
        console.error('[HILL_CHART] Failed to fetch archived collections:', error)
      })

      // Fetch snapshots with force refresh on login
      fetchSnapshots(user.id).then((fetchedSnapshots) => {
        console.log('[HILL_CHART] Loaded snapshots:', fetchedSnapshots.length)
        setSnapshots(fetchedSnapshots)
      }).catch((error) => {
        console.error('[HILL_CHART] Failed to fetch snapshots:', error)
      })
    } else if (user === null) {
      // Clear data when user is explicitly null (signed out)
      console.log('[HILL_CHART] User signed out, clearing collections data')
      setCollections([])
      setOriginalCollections([])
      setArchivedCollections([])
      setSnapshots([])
      setSelectedCollection(null)
      setCollectionInput("")
      setReleaseLineSettings({}) // Clear release line settings
      setIsLoadingCollections(false)
    }
    // Don't clear data when user is undefined (loading state)
  }, [user, selectedCollection, loadReleaseLineConfig]) // Added missing dependencies

  // Reset snapshot success state after 3 seconds
  useEffect(() => {
    if (snapshotSuccess) {
      const timer = setTimeout(() => {
        setSnapshotSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [snapshotSuccess])

  // Register service worker and handle updates
  useEffect(() => {
    const initServiceWorker = async () => {
      const { registerServiceWorker } = await import('@/lib/utils/serviceWorkerUtils')
      await registerServiceWorker()
    }
    initServiceWorker()
  }, [])

  useEffect(() => {
    if (hasCustomGradientColors) return
    const isDarkMode = resolvedTheme === "dark"
    setGradientStartColor(isDarkMode ? defaultDarkGradientStart : defaultLightGradientStart)
    setGradientEndColor(isDarkMode ? defaultDarkGradientEnd : defaultLightGradientEnd)
  }, [resolvedTheme, hasCustomGradientColors])

  // Force refresh data when user returns to the app after being away
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user?.id) {
        console.log('[HILL_CHART] User returned to app, force refreshing data...')
        try {
          // Fetch fresh data from database
          const [activeCollections, allCollections, snapshots] = await Promise.all([
            fetchCollections(user.id, false),
            fetchCollections(user.id, true),
            fetchSnapshots(user.id)
          ])

          setCollections(activeCollections)
          setOriginalCollections(activeCollections)

          const archived = allCollections.filter(c => c.status === 'archived')
          setArchivedCollections(archived)
          setSnapshots(snapshots)

          console.log('[HILL_CHART] Data refreshed successfully after visibility change')
        } catch (error) {
          console.error('[HILL_CHART] Failed to refresh data on visibility change:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  useEffect(() => {
    if (!user?.id) {
      setHasHydratedUserPreferences(false)
      return
    }

    let isCancelled = false
    const loadUserPreferences = async () => {
      try {
        const preferences = await fetchUserPreferences(user.id)
        if (!preferences || isCancelled) return

        setSelectedCollection(preferences.selectedCollectionId)
        setCollectionInput(preferences.collectionInput)
        setHideCollectionName(preferences.hideCollectionName)
        setCopyFormat(preferences.copyFormat)
        setShowTodayCollection(preferences.showTodayCollection)
        setIsSplitHillAreaFillEnabled(preferences.splitHillAreaFillEnabled)
        setDotColors({
          discovery: preferences.dotColorDiscovery,
          upslope: preferences.dotColorUpslope,
          dangerZone: preferences.dotColorDangerZone,
          downslope: preferences.dotColorDownslope,
          done: preferences.dotColorDone,
        })

        if (preferences.gradientStartColor && preferences.gradientEndColor) {
          setGradientStartColor(preferences.gradientStartColor)
          setGradientEndColor(preferences.gradientEndColor)
          setHasCustomGradientColors(true)
        } else {
          setHasCustomGradientColors(false)
        }
      } catch (error) {
        console.error('[HILL_CHART] Failed to load user preferences:', error)
      } finally {
        if (!isCancelled) {
          setHasHydratedUserPreferences(true)
        }
      }
    }

    loadUserPreferences()
    return () => {
      isCancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !hasHydratedUserPreferences) return

    const timeoutId = window.setTimeout(async () => {
      const success = await updateUserPreferences(user.id, {
        selectedCollectionId: selectedCollection,
        collectionInput,
        hideCollectionName,
        copyFormat,
        gradientStartColor: hasCustomGradientColors ? gradientStartColor : null,
        gradientEndColor: hasCustomGradientColors ? gradientEndColor : null,
        dotColorDiscovery: dotColors.discovery,
        dotColorUpslope: dotColors.upslope,
        dotColorDangerZone: dotColors.dangerZone,
        dotColorDownslope: dotColors.downslope,
        dotColorDone: dotColors.done,
        splitHillAreaFillEnabled: isSplitHillAreaFillEnabled,
        showTodayCollection,
      })

      if (!success) {
        console.error('[HILL_CHART] Failed to persist user preferences')
      }
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [
    user?.id,
    hasHydratedUserPreferences,
    selectedCollection,
    collectionInput,
    hideCollectionName,
    copyFormat,
    gradientStartColor,
    gradientEndColor,
    dotColors,
    hasCustomGradientColors,
    isSplitHillAreaFillEnabled,
    showTodayCollection,
  ])

  useEffect(() => {
    if (!user?.id || !hasHydratedUserPreferences) return

    if (!hasInitializedDotColorSyncRef.current) {
      previousDotColorsRef.current = dotColors
      hasInitializedDotColorSyncRef.current = true
      return
    }

    const previousDotColors = previousDotColorsRef.current
    const colorTransitions = new Map<string, string>([
      [previousDotColors.discovery, dotColors.discovery],
      [previousDotColors.upslope, dotColors.upslope],
      [previousDotColors.dangerZone, dotColors.dangerZone],
      [previousDotColors.downslope, dotColors.downslope],
      [previousDotColors.done, dotColors.done],
    ])

    const dotsToUpdate = collections.flatMap((collection) =>
      collection.dots
        .filter((dot) => {
          const nextColor = colorTransitions.get(dot.color)
          return typeof nextColor === "string" && nextColor !== dot.color
        })
        .map((dot) => ({
          ...dot,
          color: colorTransitions.get(dot.color) as string,
        })),
    )

    previousDotColorsRef.current = dotColors
    if (dotsToUpdate.length === 0) return

    const originalColorByDotId = new Map(
      collections.flatMap((collection) => collection.dots.map((dot) => [dot.id, dot.color] as const)),
    )
    const dotsToUpdateById = new Map(dotsToUpdate.map((dot) => [dot.id, dot.color] as const))

    setCollections((previousCollections) =>
      previousCollections.map((collection) => ({
        ...collection,
        dots: collection.dots.map((dot) => {
          const updatedColor = dotsToUpdateById.get(dot.id)
          if (!updatedColor) return dot
          return { ...dot, color: updatedColor }
        }),
      })),
    )

    void (async () => {
      const updateResults = await Promise.allSettled(
        dotsToUpdate.map((dot) => updateDotService(dot, user.id)),
      )

      const failedDotIds = dotsToUpdate
        .filter((_, index) => {
          const result = updateResults[index]
          return result.status === "rejected" || result.value === null
        })
        .map((dot) => dot.id)

      if (failedDotIds.length === 0) return

      const failedDotIdsSet = new Set(failedDotIds)
      setCollections((previousCollections) =>
        previousCollections.map((collection) => ({
          ...collection,
          dots: collection.dots.map((dot) => {
            if (!failedDotIdsSet.has(dot.id)) return dot
            const originalColor = originalColorByDotId.get(dot.id)
            if (!originalColor) return dot
            return { ...dot, color: originalColor }
          }),
        })),
      )
      console.error("[HILL_CHART] Failed to persist some dot color updates after palette change")
    })()
  }, [dotColors, collections, hasHydratedUserPreferences, user?.id])

  const todayCollectionId = user?.id ? `today-${user.id}` : null
  const realTodayCollection = todayCollectionId ? collections.find((collection) => collection.id === todayCollectionId) : null
  const nonTodayCollections = sortCollectionsBySeverity(
    collections.filter((collection) => collection.id !== todayCollectionId),
    dotColors,
  )

  const todayFlaggedDots = nonTodayCollections.flatMap((collection) =>
    collection.dots
      .filter((dot) => dot.flag_for_today && !dot.archived)
      .map((dot) => ({ ...dot, id: dot.id })),
  )

  const todayOnlyDots = realTodayCollection ? realTodayCollection.dots : []
  const todayDotKeys = new Set(todayFlaggedDots.map((dot) => dot.id))
  const mergedTodayDots = [
    ...todayFlaggedDots,
    ...todayOnlyDots.filter((dot) => !todayDotKeys.has(dot.id)),
  ]

  const todayDisplayCollection: Collection | null =
    todayCollectionId && showTodayCollection
      ? {
        id: todayCollectionId,
        name: TODAY_COLLECTION_NAME,
        status: "active",
        dots: mergedTodayDots,
      }
      : null

  const collectionsForSelector = [
    ...(todayDisplayCollection ? [todayDisplayCollection] : []),
    ...nonTodayCollections,
  ]

  const normalizedCollectionSearchQuery = collectionSearchQuery.trim().toLowerCase()
  const filteredCollectionsForSidebar = collectionsForSelector.filter((collection) =>
    collection.name.toLowerCase().includes(normalizedCollectionSearchQuery),
  )
  const totalCollectionPages = Math.max(
    1,
    Math.ceil(filteredCollectionsForSidebar.length / SIDEBAR_COLLECTIONS_PER_PAGE),
  )
  const currentCollectionPage = Math.min(collectionPage, totalCollectionPages)
  const paginatedCollectionsForSidebar = filteredCollectionsForSidebar.slice(
    (currentCollectionPage - 1) * SIDEBAR_COLLECTIONS_PER_PAGE,
    currentCollectionPage * SIDEBAR_COLLECTIONS_PER_PAGE,
  )
  const currentCollection = collectionsForSelector.find((c) => c.id === selectedCollection)
  const isTodaySelected = todayCollectionId !== null && selectedCollection === todayCollectionId

  useEffect(() => {
    setSelectedDotIds([])
  }, [selectedCollection])

  useEffect(() => {
    setCollectionPage(1)
  }, [collectionSearchQuery])

  useEffect(() => {
    if (collectionPage <= totalCollectionPages) return
    setCollectionPage(totalCollectionPages)
  }, [collectionPage, totalCollectionPages])

  const collectionsListRef = useRef<HTMLDivElement>(null)
  const collectionsWheelThrottleRef = useRef<number>(0)

  useEffect(() => {
    const listNode = collectionsListRef.current
    if (!listNode) return
    if (totalCollectionPages <= 1) return

    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (delta === 0) return
      event.preventDefault()
      const now = Date.now()
      if (now - collectionsWheelThrottleRef.current < 300) return
      collectionsWheelThrottleRef.current = now
      setCollectionPage((previousPage) => {
        if (delta > 0) return Math.min(totalCollectionPages, previousPage + 1)
        return Math.max(1, previousPage - 1)
      })
    }

    listNode.addEventListener("wheel", handleWheel, { passive: false })
    return () => listNode.removeEventListener("wheel", handleWheel)
  }, [totalCollectionPages])

  useEffect(() => {
    setDotsPage(1)
  }, [selectedCollection])

  const dotsGridRef = useRef<HTMLDivElement>(null)
  const dotsWheelThrottleRef = useRef<number>(0)

  useEffect(() => {
    if (!dotMenuOpen) return

    function handleDotActionMenuOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      const dotActionRoot = target.closest("[data-dot-action-root]")
      if (!dotActionRoot) {
        setDotMenuOpen(null)
        return
      }

      const dotId = dotActionRoot.getAttribute("data-dot-action-root")
      if (dotId !== dotMenuOpen) setDotMenuOpen(null)
    }

    document.addEventListener("mousedown", handleDotActionMenuOutsideClick)
    return () => document.removeEventListener("mousedown", handleDotActionMenuOutsideClick)
  }, [dotMenuOpen])

  useEffect(() => {
    if (!collectionActionMenuOpen) return

    function handleCollectionActionMenuOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement
      const collectionActionRoot = target.closest("[data-collection-action-root]")
      if (!collectionActionRoot) {
        setCollectionActionMenuOpen(null)
        return
      }

      const collectionId = collectionActionRoot.getAttribute("data-collection-action-root")
      if (collectionId !== collectionActionMenuOpen) setCollectionActionMenuOpen(null)
    }

    document.addEventListener("mousedown", handleCollectionActionMenuOutsideClick)
    return () => document.removeEventListener("mousedown", handleCollectionActionMenuOutsideClick)
  }, [collectionActionMenuOpen])

  useEffect(() => {
    if (showTodayCollection) return
    if (!todayCollectionId || selectedCollection !== todayCollectionId) return
    const fallbackCollection = nonTodayCollections[0]
    setSelectedCollection(fallbackCollection?.id || null)
    setCollectionInput(fallbackCollection?.name || "")
  }, [showTodayCollection, selectedCollection, todayCollectionId, nonTodayCollections])

  const updateDot = useCallback(
    async (dotId: string, updates: Partial<Dot>) => {
      if (!user) return
      const collection = collections.find((c) => c.dots.some((d) => d.id === dotId))
      if (!collection) return
      const originalDot = collection.dots.find((d) => d.id === dotId)
      if (!originalDot) return
      const updatedDot = { ...originalDot, ...updates }
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collection.id ? { ...c, dots: c.dots.map((d) => (d.id === dotId ? updatedDot : d)) } : c,
        ),
      )
      const result = await updateDotService(updatedDot, user.id)
      if (!result) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === collection.id ? { ...c, dots: c.dots.map((d) => (d.id === dotId ? originalDot : d)) } : c,
          ),
        )
      }
    },
    [user, collections],
  )

  const handleDotDrag = useCallback((dotId: string, clientX: number, clientY: number) => {
    if (!svgRef.current) return

    const svgRect = svgRef.current.getBoundingClientRect()
    const svgWidth = svgRect.width
    const svgHeight = svgRect.height

    // Calculate relative position within SVG
    const relativeX = clientX - svgRect.left
    const relativeY = clientY - svgRect.top

    // Convert to SVG coordinates (viewBox is "-50 0 700 180")
    const svgX = (relativeX / svgWidth) * 700 - 50
    const svgY = (relativeY / svgHeight) * 180

    // Constrain to chart area (0 to 600 in SVG coordinates)
    const constrainedX = Math.max(0, Math.min(600, svgX))
    const xPercent = (constrainedX / 600) * 100
    const y = getHillY(xPercent)

    // Update immediate visual feedback
    setDraggingDot({ id: dotId, x: xPercent, y })
  }, [])

  const handleDotMouseDown = useCallback((e: React.MouseEvent, dotId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(dotId)
    setDragStartPos({ x: e.clientX, y: e.clientY })

    // Set initial dragging dot position
    handleDotDrag(dotId, e.clientX, e.clientY)
  }, [handleDotDrag])

  // Document-level mouse event handlers for smooth dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDotDrag(isDragging, e.clientX, e.clientY)
      }
    }

    const handleMouseUp = () => {
      if (isDragging && draggingDot) {
        const updates: Partial<Dot> = { x: draggingDot.x, y: draggingDot.y }
        if (draggingDot.x === 100) {
          updates.color = dotColorOptions[4]
          updates.size = 1
        } else if (draggingDot.x > 50) {
          updates.color = dotColorOptions[1]
          updates.size = 3
        } else {
          updates.color = dotColorOptions[0]
          updates.size = 3
        }
        updateDot(draggingDot.id, updates)
      }
      setIsDragging(null)
      setDraggingDot(null)
      setDragStartPos(null)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, draggingDot, handleDotDrag, updateDot])

  const addDot = async () => {
    if (!newDotLabel.trim() || !selectedCollection || !user) return

    console.log('[HILL_CHART] Adding dot:', { label: newDotLabel, collectionId: selectedCollection })

    const newDot = {
      id: Date.now().toString(),
      label: newDotLabel,
      x: 50,
      y: getHillY(50),
      color: dotColorOptions[0],
      size: 3,
      archived: false,
      flag_for_today: false,
    }

    try {
      const addedDot = await addDotService(user.id, selectedCollection, newDot)
      if (addedDot) {
        console.log('[HILL_CHART] Dot created successfully:', addedDot)
        // Update local state immediately
        setCollections((prev) =>
          prev.map((c) => (c.id === selectedCollection ? { ...c, dots: [...c.dots, addedDot] } : c)),
        )
        setNewDotLabel("")
      } else {
        console.error('[HILL_CHART] Dot creation returned null')
      }
    } catch (error) {
      console.error('[HILL_CHART] Failed to create dot:', error)
    }
  }

  function startEditingDotLabel(dot: Dot) {
    setEditingDotId(dot.id)
    setEditingDotLabel(dot.label)
  }

  function cancelEditingDotLabel() {
    setEditingDotId(null)
    setEditingDotLabel("")
  }

  async function confirmEditingDotLabel(dot: Dot) {
    const trimmedLabel = editingDotLabel.trim()
    if (!trimmedLabel) {
      cancelEditingDotLabel()
      return
    }

    if (trimmedLabel !== dot.label) {
      await updateDot(dot.id, { label: trimmedLabel })
    }

    cancelEditingDotLabel()
  }

  function startEditingDotPercent(dot: Dot) {
    setEditingDotPercentId(dot.id)
    setEditingDotPercent(Math.round(dot.x).toString())
  }

  function cancelEditingDotPercent() {
    setEditingDotPercentId(null)
    setEditingDotPercent("")
  }

  async function confirmEditingDotPercent(dot: Dot) {
    const parsed = Number.parseInt(editingDotPercent, 10)
    if (Number.isNaN(parsed)) {
      cancelEditingDotPercent()
      return
    }

    const clamped = Math.max(0, Math.min(100, parsed))
    if (clamped !== Math.round(dot.x)) {
      const updates: Partial<Dot> = { x: clamped, y: getHillY(clamped) }
      if (clamped === 100) {
        updates.color = dotColorOptions[4]
        updates.size = 1
      } else if (clamped > 50) {
        updates.color = dotColorOptions[1]
        updates.size = 3
      } else {
        updates.color = dotColorOptions[0]
        updates.size = 3
      }
      await updateDot(dot.id, updates)
    }

    cancelEditingDotPercent()
  }

  function getOwningCollectionId(dotId: string): string | null {
    const owner = collections.find((collection) => collection.dots.some((dot) => dot.id === dotId))
    return owner?.id || null
  }

  const confirmDelete = async () => {
    if (deleteConfirm && user) {
      const owningCollectionId = getOwningCollectionId(deleteConfirm.dotId)
      if (!owningCollectionId) {
        setDeleteConfirm(null)
        return
      }

      const success = await deleteDotService(user.id, owningCollectionId, deleteConfirm.dotId)
      if (success) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === owningCollectionId ? { ...c, dots: c.dots.filter((d) => d.id !== deleteConfirm.dotId) } : c,
          ),
        )
      }
      setDeleteConfirm(null)
    }
  }

  const confirmBatchDelete = async () => {
    if (!batchDeleteConfirm || !user) return

    const deletionResults = await Promise.all(
      batchDeleteConfirm.dotIds.map(async (dotId) => {
        const owningCollectionId = getOwningCollectionId(dotId)
        if (!owningCollectionId) return { dotId, owningCollectionId: null, success: false }
        const success = await deleteDotService(user.id, owningCollectionId, dotId)
        return { dotId, owningCollectionId, success }
      }),
    )

    const deletedDotIds = deletionResults.filter((result) => result.success).map((result) => result.dotId)
    const deletedDotIdsByCollection = deletionResults
      .filter((result) => result.success && result.owningCollectionId)
      .reduce<Record<string, string[]>>((acc, result) => {
        const collectionId = result.owningCollectionId as string
        if (!acc[collectionId]) acc[collectionId] = []
        acc[collectionId].push(result.dotId)
        return acc
      }, {})

    if (deletedDotIds.length > 0) {
      setCollections((prev) =>
        prev.map((collection) =>
          deletedDotIdsByCollection[collection.id]
            ? {
              ...collection,
              dots: collection.dots.filter((dot) => !deletedDotIdsByCollection[collection.id].includes(dot.id)),
            }
            : collection,
        ),
      )
    }

    setSelectedDotIds((prev) => prev.filter((dotId) => !deletedDotIds.includes(dotId)))
    setBatchDeleteConfirm(null)
  }

  const archiveSelectedDots = async () => {
    if (!selectedCollection) return
    const selectedIds = activeDots.filter((dot) => selectedDotIds.includes(dot.id)).map((dot) => dot.id)
    if (selectedIds.length === 0) return

    const archiveResults = await Promise.allSettled(selectedIds.map((dotId) => updateDot(dotId, { archived: true })))
    const archivedDotIds = selectedIds.filter((_, index) => {
      const result = archiveResults[index]
      return result.status === "fulfilled"
    })

    if (archivedDotIds.length > 0) {
      setSelectedDotIds((prev) => prev.filter((dotId) => !archivedDotIds.includes(dotId)))
    }
  }

  const markSelectedDotsAsDone = async () => {
    if (!selectedCollection) return
    const selectedIds = activeDots.filter((dot) => selectedDotIds.includes(dot.id)).map((dot) => dot.id)
    if (selectedIds.length === 0) return

    const doneColor = dotColorOptions[4]
    const doneX = 100
    const doneY = getHillY(doneX)
    const doneResults = await Promise.allSettled(
      selectedIds.map((dotId) =>
        updateDot(dotId, {
          x: doneX,
          y: doneY,
          color: doneColor,
          size: 1,
        }),
      ),
    )
    const doneDotIds = selectedIds.filter((_, index) => {
      const result = doneResults[index]
      return result.status === "fulfilled"
    })

    if (doneDotIds.length > 0) {
      setSelectedDotIds((prev) => prev.filter((dotId) => !doneDotIds.includes(dotId)))
    }
  }

  const flagSelectedDotsForToday = async (enabled: boolean) => {
    if (!selectedCollection) return
    const selectedIds = activeDots.filter((dot) => selectedDotIds.includes(dot.id)).map((dot) => dot.id)
    if (selectedIds.length === 0) return

    const updateResults = await Promise.allSettled(
      selectedIds.map((dotId) =>
        updateDot(dotId, {
          flag_for_today: enabled,
        }),
      ),
    )
    const updatedDotIds = selectedIds.filter((_, index) => {
      const result = updateResults[index]
      return result.status === "fulfilled"
    })

    if (updatedDotIds.length > 0) {
      setSelectedDotIds((prev) => prev.filter((dotId) => !updatedDotIds.includes(dotId)))
    }
  }

  // Archive operation handlers
  const handleArchiveCollection = async (collectionId: string) => {
    if (!user) return
    if (todayCollectionId && collectionId === todayCollectionId) return

    const success = await archiveCollection(user.id, collectionId)
    if (success) {
      // Move collection from active to archived
      const collectionToArchive = collections.find(c => c.id === collectionId)
      if (collectionToArchive) {
        const archivedCollection = {
          ...collectionToArchive,
          status: 'archived' as const,
          archived_at: new Date().toISOString()
        }
        setCollections(prev => prev.filter(c => c.id !== collectionId))
        setArchivedCollections(prev => [...prev, archivedCollection])

        // If this was the selected collection, select another one
        if (selectedCollection === collectionId) {
          // Filter out the deleted collection first
          const filteredCollections = collections.filter(c => c.id !== collectionId)
          if (filteredCollections.length > 0) {
            const remainingCollection = filteredCollections[0]
            setSelectedCollection(remainingCollection.id)
            setCollectionInput(remainingCollection.name)
            // Load release line config for the remaining collection
            loadReleaseLineConfig(remainingCollection.id)
          } else {
            setSelectedCollection(null)
            setCollectionInput("")
          }
        }
      }
    }
    setArchiveConfirm(null)
  }

  const handleUnarchiveCollection = async (collectionId: string) => {
    if (!user) return

    const success = await unarchiveCollection(user.id, collectionId)
    if (success) {
      // Move collection from archived to active
      const collectionToUnarchive = archivedCollections.find(c => c.id === collectionId)
      if (collectionToUnarchive) {
        const activeCollection = {
          ...collectionToUnarchive,
          status: 'active' as const,
          archived_at: undefined
        }
        setArchivedCollections(prev => prev.filter(c => c.id !== collectionId))
        setCollections(prev => [...prev, activeCollection])
      }
    }
  }

  const handleDeleteCollection = async (collectionId: string) => {
    if (!user) return
    if (todayCollectionId && collectionId === todayCollectionId) return

    const success = await deleteCollection(user.id, collectionId)
    if (success) {
      // Remove collection from both active and archived lists
      setCollections(prev => prev.filter(c => c.id !== collectionId))
      setArchivedCollections(prev => prev.filter(c => c.id !== collectionId))

      // If this was the selected collection, select another one
      if (selectedCollection === collectionId) {
        // Filter out the deleted collection first
        const filteredCollections = collections.filter(c => c.id !== collectionId)
        if (filteredCollections.length > 0) {
          const remainingCollection = filteredCollections[0]
          setSelectedCollection(remainingCollection.id)
          setCollectionInput(remainingCollection.name)
          // Load release line config for the remaining collection
          loadReleaseLineConfig(remainingCollection.id)
        } else {
          setSelectedCollection(null)
          setCollectionInput("")
        }
      }
    }
    setDeleteCollectionConfirm(null)
  }

  const confirmArchiveCollection = () => {
    if (archiveConfirm) {
      handleArchiveCollection(archiveConfirm.collectionId)
    }
  }

  const confirmDeleteCollection = () => {
    if (deleteCollectionConfirm) {
      handleDeleteCollection(deleteCollectionConfirm.collectionId)
    }
  }

  const handleUnarchiveFromConflict = () => {
    if (collectionNameConflict?.archivedCollectionId) {
      handleUnarchiveCollection(collectionNameConflict.archivedCollectionId)
      setCollectionNameConflict(null)
      // Set the unarchived collection as selected
      const archivedCollection = archivedCollections.find(c => c.id === collectionNameConflict.archivedCollectionId)
      if (archivedCollection) {
        setSelectedCollection(archivedCollection.id)
        setCollectionInput(archivedCollection.name)
        // Load release line config for the unarchived collection
        loadReleaseLineConfig(archivedCollection.id)
      }
    }
  }

  const handleCollectionInputKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && collectionInput.trim() && user) {
      e.preventDefault()

      const trimmedName = collectionInput.trim()
      const nameExists = collections.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())
      const archivedExists = archivedCollections.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase())

      if (nameExists) {
        // Active collection with this name already exists
        setCollectionNameConflict({
          name: trimmedName,
          type: 'active'
        })
      } else if (archivedExists) {
        // Archived collection with this name exists
        setCollectionNameConflict({
          name: trimmedName,
          type: 'archived',
          archivedCollectionId: archivedExists.id
        })
      } else {
        // Name is available, create new collection
        const newCollection = {
          id: Date.now().toString(),
          name: trimmedName,
          status: 'active' as const,
          archived_at: undefined,
          deleted_at: undefined,
          dots: []
        }

        try {
          const added = await addCollection(user.id, newCollection.name)
          if (added) {
            console.log('[HILL_CHART] Collection created successfully:', added)
            // Update local state immediately
            setCollections((prev) => [...prev, added])
            setSelectedCollection(added.id)
            setCollectionInput(added.name)
            // Load release line config for the new collection
            loadReleaseLineConfig(added.id)
            // Clear the input after successful creation
            setCollectionInput("")
          } else {
            console.error('[HILL_CHART] Collection creation returned null')
            setCollectionNameConflict({
              name: trimmedName,
              type: 'active'
            })
          }
        } catch (error) {
          console.error("Failed to create collection:", error)
          // Show a generic error if the API call fails
          setCollectionNameConflict({
            name: trimmedName,
            type: 'active' // Assume it's a name conflict since that's the most likely cause
          })
        }
      }

      setShowDropdown(false)
      setIsTyping(false)
    }
  }

  const handleCreateCollectionFromSidebar = () => {
    if (!user) return

    const baseName = "New Collection"
    const existingNames = new Set(
      [...collections, ...archivedCollections].map((collection) => collection.name.toLowerCase()),
    )

    let nextCollectionName = baseName
    let suffix = 2
    while (existingNames.has(nextCollectionName.toLowerCase())) {
      nextCollectionName = `${baseName} ${suffix}`
      suffix += 1
    }

    setNewCollectionNameInput(nextCollectionName)
    setShowCreateCollectionModal(true)
  }

  const handleConfirmCreateCollectionFromSidebar = async () => {
    if (!user) return

    const trimmedName = newCollectionNameInput.trim()
    if (!trimmedName) return

    const nameExists = collections.some((collection) => collection.name.toLowerCase() === trimmedName.toLowerCase())
    const archivedExists = archivedCollections.find(
      (collection) => collection.name.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (nameExists) {
      setCollectionNameConflict({
        name: trimmedName,
        type: "active",
      })
      return
    }
    if (archivedExists) {
      setCollectionNameConflict({
        name: trimmedName,
        type: "archived",
        archivedCollectionId: archivedExists.id,
      })
      return
    }

    try {
      const addedCollection = await addCollection(user.id, trimmedName)
      if (!addedCollection) return

      setCollections((previousCollections) => [...previousCollections, addedCollection])
      setSelectedCollection(addedCollection.id)
      setCollectionInput(addedCollection.name)
      loadReleaseLineConfig(addedCollection.id)
      setShowDropdown(false)
      setIsTyping(false)
      setShowCreateCollectionModal(false)
      setNewCollectionNameInput("")
    } catch (error) {
      console.error("[HILL_CHART] Failed to create collection from sidebar:", error)
    }
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
        else if (text.classList.contains("text-[10px]")) text.setAttribute("font-size", "10px")
        else if (text.classList.contains("text-sm")) text.setAttribute("font-size", "14px")
        else {
          const fontSizeAttr = text.getAttribute("fontSize")
          if (fontSizeAttr) text.setAttribute("font-size", fontSizeAttr + "px")
        }
      }
      if (text.classList.contains("font-semibold")) text.setAttribute("font-weight", "600")
      else if (text.classList.contains("font-medium")) text.setAttribute("font-weight", "500")
      else if (text.classList.contains("font-normal")) text.setAttribute("font-weight", "400")
    })

    const rects = svgElement.querySelectorAll("rect")
    rects.forEach((rect) => {
      if (rect.getAttribute("fill") === "hsl(var(--background))") rect.setAttribute("fill", backgroundColor)
      if (rect.getAttribute("stroke") === "hsl(var(--border))") rect.setAttribute("stroke", borderColor)
    })

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
    ctx.letterSpacing = "0px"
    ctx.wordSpacing = "0px"
    ctx.fontKerning = "normal"

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

  const copyChartAsSVG = async () => {
    setCopyStatus("copying")
    const svgString = prepareSvgForExport()
    if (!svgString) {
      setCopyStatus("error")
      setTimeout(() => setCopyStatus("idle"), 3000)
      return
    }

    try {
      await navigator.clipboard.writeText(svgString)
      setCopyStatus("success")
      setTimeout(() => setCopyStatus("idle"), 2000)
    } catch (err) {
      console.error("Failed to copy SVG to clipboard:", err)
      setCopyStatus("error")
      setTimeout(() => setCopyStatus("idle"), 3000)
    }
  }

  const downloadChartAsPNG = async () => {
    const svgString = prepareSvgForExport()
    if (!svgString) return

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
    ctx.letterSpacing = "0px"
    ctx.wordSpacing = "0px"
    ctx.fontKerning = "normal"
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
            const now = new Date()
            const timestamp = now
              .toISOString()
              .replace(/:/g, "-")
              .replace(/\..+/, "")
              .replace("T", "_")
            const link = document.createElement("a")
            link.download = `${currentCollection?.name || "hill-chart"}_${timestamp}.png`
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

  const downloadChartAsSVG = () => {
    const svgString = prepareSvgForExport()
    if (!svgString) return

    const now = new Date()
    const timestamp = now
      .toISOString()
      .replace(/:/g, "-")
      .replace(/\..+/, "")
      .replace("T", "_")
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${currentCollection?.name || "hill-chart"}_${timestamp}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyToClipboard = () => {
    if (copyFormat === "PNG") {
      copyChartAsPNG()
    } else if (copyFormat === "SVG") {
      copyChartAsSVG()
    }
  }

  const exportCollections = () => {
    // Create clean export data with decrypted, user-readable content
    const cleanCollections = collections.map((collection) => ({
      id: collection.id,
      name: collection.name, // This is already decrypted
      status: collection.status,
      archived_at: collection.archived_at,
      deleted_at: collection.deleted_at,
      dots: (collection.dots || []).map(dot => ({
        id: dot.id,
        label: dot.label, // This is already decrypted
        x: dot.x,
        y: dot.y,
        color: dot.color,
        size: dot.size,
        archived: Boolean(dot.archived), // Ensure it's a boolean
        flag_for_today: Boolean(dot.flag_for_today),
      })),
      // Include release line configuration if it exists
      ...(releaseLineSettings[collection.id] && {
        releaseLineConfig: releaseLineSettings[collection.id]
      })
    }))

    // Clean snapshots data
    const cleanSnapshots = snapshots.map(snapshot => ({
      date: snapshot.date,
      collectionId: snapshot.collectionId,
      collectionName: snapshot.collectionName, // Already decrypted
      dots: (snapshot.dots || []).map(dot => ({
        id: dot.id,
        label: dot.label, // Already decrypted
        x: dot.x,
        y: dot.y,
        color: dot.color,
        size: dot.size,
        archived: Boolean(dot.archived),
        flag_for_today: Boolean(dot.flag_for_today),
      })),
      timestamp: snapshot.timestamp,
      // Include release line configuration if it exists in the snapshot
      ...(snapshot.releaseLineConfig && {
        releaseLineConfig: snapshot.releaseLineConfig
      })
    }))

    const exportData: ExportData = {
      collections: cleanCollections,
      snapshots: cleanSnapshots,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `hill-chart-data_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowEllipsisMenu(false)
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    console.log('[HILL_CHART] Starting import process for file:', file.name)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string
        const data = JSON.parse(fileContent) as ExportData

        console.log('[HILL_CHART] Parsed import data:', {
          collections: data.collections?.length || 0,
          snapshots: data.snapshots?.length || 0
        })

        // Import the data
        const importedCollections = await importData(user.id, data)
        console.log('[HILL_CHART] Import completed, imported collections:', importedCollections.length)

        // Add a small delay to ensure database operations are complete
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Fetch fresh data from database to ensure state is synchronized
        console.log('[HILL_CHART] Fetching fresh collections after import...')
        const fetched = await fetchCollections(user.id, false) // Only active collections

        console.log('[HILL_CHART] Raw fetched data:', fetched)

        if (fetched && fetched.length > 0) {
          console.log('[HILL_CHART] Successfully fetched collections after import:', fetched.length)
          console.log('[HILL_CHART] First collection details:', fetched[0])

          setCollections(fetched)
          setSelectedCollection(fetched[0].id)
          setCollectionInput(fetched[0].name)
          // Load release line config for the first imported collection
          loadReleaseLineConfig(fetched[0].id)

          // Also fetch archived collections if any
          console.log('[HILL_CHART] Fetching archived collections...')
          const allCollections = await fetchCollections(user.id, true)
          const archived = allCollections.filter(c => c.status === 'archived')
          setArchivedCollections(archived)

          console.log('[HILL_CHART] State updated successfully after import')
          console.log('[HILL_CHART] Current collections state:', fetched)
        } else {
          console.warn('[HILL_CHART] No collections found after import, this might indicate an issue')
          console.warn('[HILL_CHART] Fetched data:', fetched)
          console.warn('[HILL_CHART] User ID:', user.id)

          // Force a refresh of the collections state
          setCollections([])
          setSelectedCollection(null)
          setCollectionInput("")
        }

        setShowImportSuccess(true)

        // Clear any previous errors
        setImportError(null)

      } catch (error) {
        console.error("[HILL_CHART] Import error:", error)
        setImportError(error instanceof Error ? error.message : String(error))
        setShowImportSuccess(false)
      }
    }

    reader.onerror = () => {
      console.error('[HILL_CHART] File reading error')
      setImportError('Failed to read file')
      setShowImportSuccess(false)
    }

    reader.readAsText(file)
    setShowEllipsisMenu(false)
    event.target.value = ""
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
    setShowDropdown(true)
  }

  const handleInputFocus = () => {
    setShowDropdown(true)
  }

  const toggleDropdown = () => {
    if (!showDropdown) {
      setCollectionInput("")
    }
    setShowDropdown(!showDropdown)
    setIsTyping(false)
  }

  const handleCollectionSelect = (collection: Collection) => {
    setSelectedCollection(collection.id)
    setCollectionInput(collection.name)
    setShowDropdown(false)
    setIsTyping(false)
    setSelectedSnapshot(null)
    // Load release line config for the selected collection
    loadReleaseLineConfig(collection.id)
  }

  // Start editing collection name
  const startEditCollection = (collection: Collection) => {
    setIsEditingCollection(true)
    setEditingCollectionName(collection.name)
    setEditingCollectionId(collection.id)
    setShowDropdown(false)
  }

  // Save collection name changes
  const saveCollectionEdit = async () => {
    if (!user || !editingCollectionId || !editingCollectionName.trim()) {
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

    // Optimistically update UI
    const originalCollections = [...collections]
    setCollections(prev =>
      prev.map(c =>
        c.id === editingCollectionId
          ? { ...c, name: trimmedName }
          : c
      )
    )
    setCollectionInput(trimmedName)

    // Update backend
    const success = await updateCollection(user.id, editingCollectionId, { name: trimmedName })

    if (!success) {
      // Revert on error
      setCollections(originalCollections)
      setCollectionInput(collections.find(c => c.id === editingCollectionId)?.name || "")
      console.error("Failed to update collection name")
    }

    setIsEditingCollection(false)
    setEditingCollectionName("")
    setEditingCollectionId(null)
  }

  // Cancel collection name editing
  const cancelCollectionEdit = () => {
    setIsEditingCollection(false)
    setEditingCollectionName("")
    setEditingCollectionId(null)
  }

  // Handle key press in edit mode
  const handleEditKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveCollectionEdit()
    } else if (e.key === "Escape") {
      cancelCollectionEdit()
    }
  }



  // Snapshot functions
  const handleCreateSnapshot = async () => {
    if (!user || !currentCollection) return

    // Ensure every dot has an explicit archived property
    const dotsWithArchived = (currentCollection.dots || []).map(dot => ({
      ...dot,
      archived: dot.archived // force boolean
    }))

    // Get current release line configuration for this collection
    const currentReleaseLineConfig = releaseLineSettings[currentCollection.id]

    try {
      const success = await createSnapshot(
        user.id,
        currentCollection.id,
        currentCollection.name,
        dotsWithArchived,
        currentReleaseLineConfig
      )

      if (success) {
        // Refresh snapshots
        const updatedSnapshots = await fetchSnapshots(user.id)
        setSnapshots(updatedSnapshots)
        setSnapshotSuccess(true) // Set success state
        // Could add a toast notification here for success
      } else {
        // Could add error handling here
        console.error("Failed to create snapshot")
      }
    } catch (error) {
      console.error("Error creating snapshot:", error)
    }
  }

  const handleViewSnapshot = async (dateString: string) => {
    if (!user) return

    try {
      const snapshotForDate = snapshots.find(s => s.date === dateString)
      if (!snapshotForDate) {
        console.error("Snapshot not found for date:", dateString)
        return
      }

      // Store original collections before switching to snapshot
      setOriginalCollections(collections)

      // Create snapshot collections with the snapshot data
      const snapshotCollection: Collection = {
        id: snapshotForDate.collectionId,
        name: snapshotForDate.collectionName,
        status: 'active' as const,
        archived_at: undefined,
        deleted_at: undefined,
        dots: snapshotForDate.dots
      }

      setSnapshotCollections([snapshotCollection])
      setCollections([snapshotCollection])
      setSelectedCollection(snapshotCollection.id)
      setCollectionInput(snapshotCollection.name)
      setCurrentSnapshot(snapshotForDate)
      setIsViewingSnapshot(true)
      setSelectedSnapshot(dateString)
      
      // Use release line config from snapshot if available, otherwise load from database
      if (snapshotForDate.releaseLineConfig) {
        setReleaseLineSettings(prev => ({
          ...prev,
          [snapshotCollection.id]: snapshotForDate.releaseLineConfig!
        }))
      } else {
        // Load release line config from database for the snapshot collection
        loadReleaseLineConfig(snapshotCollection.id)
      }
    } catch (error) {
      console.error("Error viewing snapshot:", error)
    }
  }

  const handleViewLive = () => {
    // Restore original collections
    setCollections(originalCollections)
    const firstCollection =
      originalCollections.find((collection) => !todayCollectionId || collection.id !== todayCollectionId) ||
      originalCollections[0]
    setSelectedCollection(firstCollection?.id || null)
    setCollectionInput(firstCollection?.name || "")
    setCurrentSnapshot(null)
    setIsViewingSnapshot(false)
    setSelectedSnapshot(null)
    // Load release line config for the restored collection
    if (firstCollection) {
      loadReleaseLineConfig(firstCollection.id)
    }
  }

  // Add tip handler function
  const handleTipClick = () => {
    // Replace 'your-paypal-username' with your actual PayPal.me username
    const paypalLink = 'https://paypal.me/gfaurobert'
    window.open(paypalLink, '_blank')
    setShowEllipsisMenu(false)
  }

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
              ${isSelected
                ? "bg-primary text-primary-foreground"
                : hasSnapshot
                  ? "bg-accent text-accent-foreground hover:bg-accent/80"
                  : "text-muted-foreground"
              }
              ${isToday && !isSelected ? "border border-primary" : ""}
            `}
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
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={handleViewLive}
            >
              View Live
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className={`w-full flex items-center gap-2 transition-all duration-300 ${snapshotSuccess
                ? "border-green-500 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:border-green-400 dark:bg-green-400/10 dark:text-green-400 dark:hover:bg-green-400/20"
                : ""
                }`}
              onClick={handleCreateSnapshot}
            >
              <Camera className="w-4 h-4" />
              {snapshotSuccess ? "New Snapshot Created" : "Snapshot"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Before rendering the dot list, define activeDots and archivedDots (sorted by position on line: higher x = top of list)
  const activeDots: Dot[] = (currentCollection?.dots || [])
    .filter((dot: Dot) => !dot.archived)
    .sort((a, b) => b.x - a.x);
  const archivedDots: Dot[] = (currentCollection?.dots || [])
    .filter((dot: Dot) => dot.archived)
    .sort((a, b) => b.x - a.x);
  const selectedActiveDotCount = activeDots.filter((dot) => selectedDotIds.includes(dot.id)).length

  const totalDotsPages = Math.max(1, Math.ceil(activeDots.length / DOTS_PER_PAGE))
  const currentDotsPage = Math.min(dotsPage, totalDotsPages)
  const paginatedActiveDots = activeDots.slice(
    (currentDotsPage - 1) * DOTS_PER_PAGE,
    currentDotsPage * DOTS_PER_PAGE,
  )

  useEffect(() => {
    if (dotsPage <= totalDotsPages) return
    setDotsPage(totalDotsPages)
  }, [dotsPage, totalDotsPages])

  useEffect(() => {
    const gridNode = dotsGridRef.current
    if (!gridNode) return
    if (totalDotsPages <= 1) return

    const handleWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (delta === 0) return
      event.preventDefault()
      const now = Date.now()
      if (now - dotsWheelThrottleRef.current < 300) return
      dotsWheelThrottleRef.current = now
      setDotsPage((previousPage) => {
        if (delta > 0) return Math.min(totalDotsPages, previousPage + 1)
        return Math.max(1, previousPage - 1)
      })
    }

    gridNode.addEventListener("wheel", handleWheel, { passive: false })
    return () => gridNode.removeEventListener("wheel", handleWheel)
  }, [totalDotsPages])

  function handleGradientColorChange(colorRole: "start" | "end", value: string) {
    setHasCustomGradientColors(true)
    if (colorRole === "start") setGradientStartColor(value)
    else setGradientEndColor(value)
  }

  function handleResetGradientColors() {
    const isDarkMode = resolvedTheme === "dark"
    setHasCustomGradientColors(false)
    setGradientStartColor(isDarkMode ? defaultDarkGradientStart : defaultLightGradientStart)
    setGradientEndColor(isDarkMode ? defaultDarkGradientEnd : defaultLightGradientEnd)
  }

  function handleResetDotColors() {
    setDotColors({ ...defaultDotColors })
  }

  const hillCurvePath = generateBellCurvePath(600, 150, 300)
  const hillAreaPath = `${hillCurvePath} L 600 150 L 0 150 Z`

  return (
    <div
      className="min-h-screen px-4 py-3 "
      style={{
        userSelect: isDragging ? "none" : "auto",
        backgroundImage: `linear-gradient(135deg, ${gradientStartColor} 0%, ${gradientEndColor} 100%)`,
      }}
    >
      <div className="mx-auto max-w-[1294px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Left Bar */}
          <div className="rounded-lg shadow-[0px_16px_20px_5px_rgba(0,0,0,0.1)] lg:h-[809px] lg:max-h-[809px]">
            <Card className="h-full lg:h-[809px] shadow-none overflow-visible flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <CardTitle className="text-lg">Over The Hill</CardTitle>
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
                    onClick={() => {
                      if (!showEllipsisMenu) setShowColorSettingsModal(false)
                      setShowEllipsisMenu(!showEllipsisMenu)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>

                  {showEllipsisMenu && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
                      onMouseDown={() => setShowEllipsisMenu(false)}
                    >
                      <div
                        ref={settingsModalRef}
                        className="w-[95vw] max-w-5xl md:min-w-[800px] max-h-[85vh] overflow-hidden rounded-lg border border-border bg-background shadow-lg"
                        onMouseDown={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-between border-b border-border px-4 py-3">
                          <h3 className="text-base font-semibold">Settings</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEllipsisMenu(false)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 overflow-y-auto max-h-[calc(85vh-56px)]">
                          <div className="py-1 rounded-md border border-border/60">
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
                            setShowColorSettingsModal(true)
                            setShowEllipsisMenu(false)
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          <Palette className="w-4 h-4" /> Color Settings
                        </button>
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
                            setShowTodayCollection(!showTodayCollection)
                            setShowEllipsisMenu(false)
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          <Sun className="w-4 h-4" /> Show Today Collection{" "}
                          {showTodayCollection && <Check className="w-4 h-4 ml-auto" />}
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
                          onClick={() => {
                            setShowArchivedCollectionsModal(true)
                            setShowEllipsisMenu(false)
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          <ArchiveIcon className="w-4 h-4" /> Archived Collections
                          {archivedCollections.length > 0 && (
                            <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                              {archivedCollections.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={exportCollections}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          <DownloadIcon className="w-4 h-4" /> Export Collections
                        </button>
                        <label className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 cursor-pointer">
                          <UploadIcon className="w-4 h-4" /> Import Collections
                          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                        </label>
                      </div>
                      <div className="py-1 rounded-md border border-border/60">
                        {/* Account Section */}
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                          Account
                        </div>
                        {/* Username Display */}
                        <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 shrink-0 rounded-full bg-green-500"></div>
                            <span className="truncate max-w-[180px]" title={user?.user_metadata?.name || user?.email || 'Unknown User'}>
                              {user?.user_metadata?.name || user?.email || 'Unknown User'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowEllipsisMenu(false)
                            onResetPassword()
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          Reset Password
                        </button>
                        <SignOutButton className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-500 hover:bg-accent hover:text-accent-foreground flex items-center gap-2" />

                        {/* Cache Status Section */}
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                          Cache Status
                        </div>
                        <div className="px-3 py-2 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Data Sync</span>
                          <CacheStatusBadge />
                        </div>
                        <button
                          onClick={async () => {
                            if (user?.id) {
                              console.log('[HILL_CHART] Manual data refresh requested')
                              setIsLoadingCollections(true)
                              try {
                                // Fetch fresh data from database

                                const [activeCollections, allCollections, snapshots] = await Promise.all([
                                  fetchCollections(user.id, false),
                                  fetchCollections(user.id, true),
                                  fetchSnapshots(user.id)
                                ])

                                setCollections(activeCollections)
                                setOriginalCollections(activeCollections)

                                const archived = allCollections.filter(c => c.status === 'archived')
                                setArchivedCollections(archived)
                                setSnapshots(snapshots)

                                console.log('[HILL_CHART] Manual refresh completed successfully')
                              } catch (error) {
                                console.error('[HILL_CHART] Manual refresh failed:', error)
                              } finally {
                                setIsLoadingCollections(false)
                                setShowEllipsisMenu(false)
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Refresh Data
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('This will clear all stored data and force a complete refresh. Continue?')) {
                              console.log('[HILL_CHART] Manual storage clear requested')
                              try {
                                const { clearAllAppStorage } = await import('@/lib/utils/storageUtils')
                                await clearAllAppStorage()
                                console.log('[HILL_CHART] All storage cleared successfully')
                                // Reload the page to start fresh
                                window.location.reload()
                              } catch (error) {
                                console.error('[HILL_CHART] Failed to clear storage:', error)
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 text-orange-600 dark:text-orange-400"
                        >
                          <Trash2 className="w-4 h-4" /> Clear Local Storage
                        </button>
                        {/* Privacy Section */}
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-t border-border mt-1">
                          Privacy
                        </div>
                        <button
                          onClick={() => {
                            setShowPrivacySettings(true)
                            setShowEllipsisMenu(false)
                          }}
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                        >
                          <Shield className="w-4 h-4" /> Privacy Settings
                        </button>

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
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-1 min-h-0 flex-col gap-3">
                <div ref={collectionsListRef} className="flex flex-1 min-h-0 flex-col gap-2">
                  <label className="text-sm font-medium mb-2 block">Collections</label>
                  <Input
                    value={collectionSearchQuery}
                    onChange={(event) => setCollectionSearchQuery(event.target.value)}
                    placeholder="Search collections..."
                    className="h-8 text-xs"
                  />
                  {isLoadingCollections ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground flex items-center gap-2 rounded-md border border-border">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Loading collections...
                    </div>
                  ) : collectionsForSelector.length > 0 ? (
                    filteredCollectionsForSidebar.length > 0 ? (
                      <>
                        <div className="min-h-0 flex-1 space-y-1 overflow-x-hidden pt-1.5 pr-2 pb-0.5">
                          {paginatedCollectionsForSidebar.map((collection) => {
                        const isSelectedCollection = selectedCollection === collection.id
                        const isTodayCollection = todayCollectionId !== null && collection.id === todayCollectionId
                        const isEditingThisCollection = isEditingCollection && editingCollectionId === collection.id

                        return (
                          <div
                            key={collection.id}
                            className="relative"
                            data-collection-action-root={collection.id}
                          >
                            {isEditingThisCollection ? (
                              <div className="flex items-center gap-2 rounded-md border border-border bg-background p-2">
                                <Input
                                  ref={editInputRef}
                                  value={editingCollectionName}
                                  onChange={(e) => setEditingCollectionName(e.target.value)}
                                  onKeyDown={handleEditKeyPress}
                                  className="h-8 text-sm"
                                  placeholder="Collection name"
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={saveCollectionEdit}
                                  className="h-8 w-8 p-0"
                                  disabled={!editingCollectionName.trim()}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelCollectionEdit}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                {(() => {
                                  const severity = getCollectionSeverity(collection, dotColors)
                                  const ariaLabel = severity.statusLabel
                                    ? `${collection.name}, ${severity.statusLabel}`
                                    : collection.name
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleCollectionSelect(collection)}
                                        aria-label={ariaLabel}
                                        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${isSelectedCollection
                                          ? "border-primary/40 bg-primary/10 text-foreground"
                                          : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
                                          } ${isTodayCollection ? "pr-3" : "pr-10"}`}
                                      >
                                        <span className="block truncate">{collection.name}</span>
                                      </button>
                                      {severity.indicatorColor && (
                                        <span
                                          aria-hidden="true"
                                          data-testid="collection-severity-dot"
                                          className={cn(
                                            "pointer-events-none absolute top-1 right-1 z-10 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                                            severity.indicatorColor === "red" && "bg-red-500 dark:bg-red-400",
                                            severity.indicatorColor === "amber" && "bg-amber-400 dark:bg-amber-300",
                                            severity.indicatorColor === "emerald" && "bg-emerald-500 dark:bg-emerald-400",
                                          )}
                                        />
                                      )}
                                    </>
                                  )
                                })()}
                                {!isTodayCollection && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setCollectionActionMenuOpen((previousValue) =>
                                          previousValue === collection.id ? null : collection.id,
                                        )
                                      }}
                                      title="Collection actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    {collectionActionMenuOpen === collection.id && (
                                      <div className="absolute right-1 top-9 z-20 min-w-[140px] rounded-md border border-border bg-background shadow-md">
                                        <button
                                          type="button"
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-accent hover:text-accent-foreground"
                                          onClick={() => {
                                            startEditCollection(collection)
                                            setCollectionActionMenuOpen(null)
                                          }}
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-accent hover:text-accent-foreground"
                                          onClick={() => {
                                            setArchiveConfirm({
                                              collectionId: collection.id,
                                              collectionName: collection.name,
                                            })
                                            setCollectionActionMenuOpen(null)
                                          }}
                                        >
                                          <ArchiveIcon className="h-3.5 w-3.5" />
                                          Archive
                                        </button>
                                        <button
                                          type="button"
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-destructive hover:bg-accent"
                                          onClick={() => {
                                            setDeleteCollectionConfirm({
                                              collectionId: collection.id,
                                              collectionName: collection.name,
                                            })
                                            setCollectionActionMenuOpen(null)
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )
                          })}
                        </div>
                        {totalCollectionPages > 1 && (
                          <div
                            className="mt-2 flex items-center justify-center gap-1.5"
                            role="tablist"
                            aria-label="Collections pagination"
                          >
                            {Array.from({ length: totalCollectionPages }, (_, index) => {
                              const pageNumber = index + 1
                              const isActivePage = pageNumber === currentCollectionPage
                              return (
                                <button
                                  key={pageNumber}
                                  type="button"
                                  role="tab"
                                  aria-selected={isActivePage}
                                  aria-label={`Go to page ${pageNumber}`}
                                  onClick={() => setCollectionPage(pageNumber)}
                                  className={`h-1.5 rounded-full transition-all duration-200 ${isActivePage
                                    ? "w-5 bg-foreground"
                                    : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                                    }`}
                                />
                              )
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground rounded-md border border-border">
                        No collections match your search
                      </div>
                    )
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground rounded-md border border-border">
                      No collections found
                    </div>
                  )}
                </div>
                <Button className="w-full mt-auto" variant="outline" size="sm" onClick={handleCreateCollectionFromSidebar}>
                  + New Collection
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Main Chart Area */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2.35fr_1fr]">
          <div className="space-y-4 rounded-lg shadow-[0px_16px_20px_5px_rgba(0,0,0,0.1)]">
            <Card className="h-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-3">
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
                    className={`transition-colors ${copyStatus === "success"
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
              <CardContent className="p-3 pt-0">
                {/* Loading overlay */}
                {isLoadingCollections && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                    <div className="flex flex-col items-center gap-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <div className="text-sm text-muted-foreground">
                        <div>Loading collections...</div>
                        <div className="text-xs mt-1">Decrypting your data</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="relative flex h-[235px] w-full items-center justify-center rounded-md bg-background">
                  <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox="-28 -46 655 210"
                    className="overflow-visible max-w-full"
                    style={{ userSelect: isDragging ? "none" : "auto" }}
                  >
                    <defs>
                      <linearGradient id="hillGradientFill" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.12" />
                        <stop offset="55%" stopColor="#60a5fa" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.14" />
                      </linearGradient>
                      <clipPath id="splitHillLeftClip">
                        <rect x="0" y="-60" width="300" height="240" />
                      </clipPath>
                      <clipPath id="splitHillRightClip">
                        <rect x="300" y="-60" width="300" height="240" />
                      </clipPath>
                    </defs>
                    {/* Bell curve area fill */}
                    {isSplitHillAreaFillEnabled ? (
                      <>
                        <path
                          d={hillAreaPath}
                          fill={gradientStartColor}
                          fillOpacity="0.22"
                          clipPath="url(#splitHillLeftClip)"
                          stroke="none"
                        />
                        <path
                          d={hillAreaPath}
                          fill={gradientEndColor}
                          fillOpacity="0.22"
                          clipPath="url(#splitHillRightClip)"
                          stroke="none"
                        />
                      </>
                    ) : (
                      <path
                        d={hillAreaPath}
                        fill="url(#hillGradientFill)"
                        stroke="none"
                      />
                    )}
                    {/* Bell curve */}
                    <path
                      className="bg-transparent shadow-none leading-9"
                      d={hillCurvePath}
                      stroke="#374151"
                      strokeWidth="1.25"
                      fill="none"
                    />

                    {/* Base line */}
                    <line
                      className="leading-3"
                      x1="0"
                      y1="150"
                      x2="600"
                      y2="150"
                      stroke="#374151"
                      strokeWidth="1.15"
                    />

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
                      <text
                        x="300"
                        y="175"
                        textAnchor="middle"
                        className="font-semibold text-sm fill-foreground"
                      >
                        {currentCollection?.name}
                      </text>
                    )}
                    <text x="570" y="160" textAnchor="middle" className="text-[8px] fill-muted-foreground">
                      Delivery
                    </text>

                    {/* Release Line */}
                    {(() => {
                      const currentReleaseLineConfig = selectedCollection ? releaseLineSettings[selectedCollection] : null
                      if (!currentReleaseLineConfig?.enabled) return null

                      return (
                        <g>
                          {/* Vertical release line */}
                          <line
                            x1="600"
                            y1="-20"
                            x2="600"
                            y2="151"
                            stroke={currentReleaseLineConfig.color}
                            strokeWidth="3"
                          />
                          {/* Release line text */}
                          {currentReleaseLineConfig.text && (() => {
                            const displayText = currentReleaseLineConfig.text.length > 12
                              ? currentReleaseLineConfig.text.substring(0, 12)
                              : currentReleaseLineConfig.text;
                            // Dynamic X position: 1 char = 585, 12 chars = 650
                            const dynamicX = 585 + (displayText.length - 1) * (65 / 11);
                            
                            return (
                              <text
                                x={dynamicX}
                                y="10"
                                textAnchor="end"
                                className="text-[10px] font-medium"
                                fill={currentReleaseLineConfig.color}
                                transform={`rotate(90, 605, 12)`}
                              >
                                {displayText}
                              </text>
                            );
                          })()}
                        </g>
                      )
                    })()}

                    {/* Dots with Collision Detection */}
                    {(() => {
                      // Type definitions for collision detection
                      interface LabelPosition {
                        id: string;
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                        originalDotY: number;
                        displayX: number;
                        displayY: number;
                        fontSize: number;
                        stackLevel: number;
                        stackDirection?: number;
                        textCenterX: number; // Added for text centering
                      }

                      // Collision detection and label stacking functions
                      const calculateLabelPositions = (dots: Dot[]): Record<string, LabelPosition> => {
                        if (!dots || dots.length === 0) return {};

                        const positions: Record<string, LabelPosition> = {};
                        const SVG_WIDTH = 600;

                        // Calculate initial positions and dimensions for all labels
                        dots.forEach(dot => {
                          const dotX = (dot.x / 100) * SVG_WIDTH;
                          const fontSize = 8 + dot.size * 1;
                          const textWidth = dot.label.length * (fontSize * 0.6) + 16;
                          const textHeight = fontSize + 12;

                          // Handle dragging with null safety
                          const isBeingDragged = draggingDot?.id === dot.id;
                          const displayX = isBeingDragged && draggingDot ? (draggingDot.x / 100) * SVG_WIDTH : dotX;
                          const displayY = isBeingDragged && draggingDot ? draggingDot.y : dot.y;

                          // Clamp label X so it never overflows left or right edge
                          let labelX = displayX - textWidth / 2;
                          if (labelX < 0) labelX = 0;
                          if (labelX + textWidth > SVG_WIDTH) labelX = SVG_WIDTH - textWidth;

                          // Calculate the text's actual X so it stays centered above the dot, but never outside the label background
                          let textCenterX = displayX;
                          if (textCenterX < labelX + textWidth / 2) textCenterX = Math.max(labelX + textWidth / 2, textCenterX);
                          if (textCenterX > labelX + textWidth / 2) textCenterX = Math.min(labelX + textWidth / 2, textCenterX);
                          // If the dot is near the edge, clamp the text center to the middle of the label background
                          if (displayX < labelX) textCenterX = labelX + textWidth / 2;
                          if (displayX > labelX + textWidth) textCenterX = labelX + textWidth / 2;

                          positions[dot.id] = {
                            id: dot.id,
                            x: labelX,
                            y: displayY - 35,
                            width: textWidth,
                            height: textHeight,
                            originalDotY: displayY,
                            displayX,
                            displayY,
                            fontSize,
                            stackLevel: 0,
                            textCenterX
                          };
                        });

                        return positions;
                      };

                      const detectCollisions = (label1: LabelPosition, label2: LabelPosition): boolean => {
                        return !(
                          label1.x + label1.width < label2.x ||
                          label2.x + label2.width < label1.x ||
                          label1.y + label1.height < label2.y ||
                          label2.y + label2.height < label1.y
                        );
                      };

                      const resolveCollisions = (labelPositions: Record<string, LabelPosition>): Record<string, LabelPosition> => {
                        const resolved: Record<string, LabelPosition> = {};
                        const positionsArray = Object.values(labelPositions);

                        // Sort by X position for left-to-right processing
                        positionsArray.sort((a: LabelPosition, b: LabelPosition) => a.x - b.x);

                        // Define viewBox boundaries with padding
                        const MIN_Y = 10; // Top boundary with padding
                        const MAX_Y = 160; // Bottom boundary (leave space for chart labels)
                        const MAX_STACK_ATTEMPTS = 50; // Safeguard: max attempts to resolve collision

                        positionsArray.forEach((current: LabelPosition) => {
                          let testY = current.y;
                          let stackLevel = 0;
                          let hasCollision = true;
                          let stackDirection = -1; // -1 for upward, 1 for downward
                          let attempts = 0;
                          while (hasCollision && attempts < MAX_STACK_ATTEMPTS) {
                            hasCollision = Object.values(resolved).some((placed: LabelPosition) =>
                              detectCollisions({ ...current, y: testY }, placed)
                            );
                            if (hasCollision) {
                              stackLevel++;

                              // Calculate potential new position
                              let newY: number;
                              if (stackDirection === -1) {
                                // Try stacking upward first
                                newY = current.originalDotY - 35 - (stackLevel * (current.height + 8));

                                // Check if upward stacking would overflow top boundary
                                if (newY < MIN_Y) {
                                  // Switch to downward stacking
                                  stackDirection = 1;
                                  stackLevel = 1; // Reset stack level for downward direction
                                  newY = current.originalDotY - 35 + (stackLevel * (current.height + 8));
                                }
                              } else {
                                // Stack downward
                                newY = current.originalDotY - 35 + (stackLevel * (current.height + 8));

                                // Check if downward stacking would overflow bottom boundary
                                if (newY + current.height > MAX_Y) {
                                  // Clamp to bottom boundary
                                  newY = MAX_Y - current.height;
                                }
                              }

                              testY = newY;
                            }
                            attempts++;
                          }

                          // If max attempts reached, just place at last tried position
                          resolved[current.id] = {
                            ...current,
                            y: testY,
                            stackLevel,
                            stackDirection
                          };
                        });

                        return resolved;
                      };

                      // Calculate label positions with collision detection
                      const initialLabelPositions = calculateLabelPositions((currentCollection?.dots || []).filter(dot => !dot.archived));
                      const labelPositions = resolveCollisions(initialLabelPositions);

                      // Render dots with collision-free labels
                      return (currentCollection?.dots || []).filter(dot => !dot.archived).map((dot) => {
                        const dotX = (dot.x / 100) * 600;

                        // Use draggingDot for immediate feedback if this dot is being dragged with null safety
                        const isBeingDragged = draggingDot?.id === dot.id;
                        const currentXPercent = isBeingDragged && draggingDot ? draggingDot.x : dot.x;
                        const displayX = (currentXPercent / 100) * 600;
                        const displayY = isBeingDragged && draggingDot ? draggingDot.y : dot.y;
                        const isBelowFiftyPercent = currentXPercent < 50;
                        const displayDotSize = isBelowFiftyPercent ? 3 : dot.size;
                        const displayDotColor = isBelowFiftyPercent ? defaultDotColors.discovery : dot.color;
                        const dotRadius = 4 + displayDotSize * 2;

                        // Get calculated label position
                        const labelPos = labelPositions[dot.id];
                        if (!labelPos) return null;

                        // Calculate visual hierarchy opacity
                        const opacity = Math.max(0.95, 1.0 - (labelPos.stackLevel * 0.025));

                        return (
                          <g key={dot.id}>
                            <circle
                              cx={displayX}
                              cy={displayY}
                              r={dotRadius}
                              fill={displayDotColor}
                              stroke="#fff"
                              strokeWidth="2"
                              className={`cursor-pointer hover:opacity-80 ${isBeingDragged ? '' : 'transition-all'}`}
                              onMouseDown={(e) => handleDotMouseDown(e, dot.id)}
                            />
                            <rect
                              x={labelPos.x}
                              y={labelPos.y}
                              width={labelPos.width}
                              height={labelPos.height}
                              rx="8"
                              ry="8"
                              fill={displayDotColor}
                              stroke="hsl(var(--border))"
                              strokeWidth="1"
                              opacity={opacity}
                              className="pointer-events-none"
                            />
                            <text
                              x={labelPos.textCenterX}
                              y={labelPos.y + labelPos.height / 2}
                              textAnchor="middle"
                              className={`pointer-events-none select-none ${resolvedTheme === 'dark' ? 'fill-black' : 'fill-foreground'}`}
                              dominantBaseline="central"
                              fontSize={labelPos.fontSize}
                              opacity={opacity}
                              style={{ userSelect: "none" }}
                            >
                              {dot.label}
                            </text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Snapshots */}
          <div className="space-y-3 rounded-lg shadow-[0px_16px_20px_5px_rgba(0,0,0,0.1)]">
            <Card className="shadow-none">
              <CardHeader className="py-3">
                <CardTitle className="text-lg">Snapshots</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {renderCalendar()}
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Dots section */}
      <Card className="shadow-[0px_16px_20px_5px_rgba(0,0,0,0.1)] lg:h-[392px] lg:max-h-[392px] lg:overflow-hidden lg:flex lg:flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-3">
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
        <CardContent className="space-y-3 pt-0 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          <Input
            placeholder="Enter dot name and press Enter to add..."
            value={newDotLabel}
            onChange={(e) => {
              if (e.target.value.length <= 24) {
                setNewDotLabel(e.target.value)
              }
            }}
            onFocus={() => setEditingDotId(null)}
            onKeyPress={(e) => e.key === "Enter" && addDot()}
            maxLength={24}
            className="mt-1.5 h-8 text-xs"
          />
          {newDotLabel.length === 24 && editingDotId === null && (
            <div className="text-xs text-red-500 mt-1">Dot name cannot exceed 24 characters.</div>
          )}
          {activeDots.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {selectedActiveDotCount > 0
                  ? `${selectedActiveDotCount} selected`
                  : "Select dots to batch edit"}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => {
                    const allActiveDotIds = activeDots.map((dot) => dot.id)
                    setSelectedDotIds((prev) => {
                      const areAllSelected =
                        allActiveDotIds.length > 0 && allActiveDotIds.every((dotId) => prev.includes(dotId))
                      return areAllSelected ? [] : allActiveDotIds
                    })
                  }}
                >
                  {selectedActiveDotCount === activeDots.length ? "Clear" : "Select all"}
                </Button>
                {selectedActiveDotCount > 0 && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[12px]"
                      onClick={archiveSelectedDots}
                    >
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[12px]"
                      onClick={markSelectedDotsAsDone}
                    >
                      Mark as Done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[12px]"
                      onClick={() => flagSelectedDotsForToday(true)}
                    >
                      Flag for Today
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[12px]"
                      onClick={() => flagSelectedDotsForToday(false)}
                    >
                      Unflag Today
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 px-2 text-[12px]"
                      onClick={() =>
                        setBatchDeleteConfirm({
                          dotIds: activeDots.filter((dot) => selectedDotIds.includes(dot.id)).map((dot) => dot.id),
                          count: selectedActiveDotCount,
                        })
                      }
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          <div ref={dotsGridRef} className="h-[206px] overflow-hidden pb-1">
            <div className="grid grid-flow-col grid-rows-2 auto-cols-[minmax(170px,170px)] gap-4">
              {paginatedActiveDots.map((dot: Dot) => (
              <div
                key={dot.id}
                className={`rounded-md border bg-background p-2.5 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)] ${selectedDotIds.includes(dot.id) ? "border-destructive/70 ring-1 ring-destructive/40" : "border-border"}`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className={`h-4 w-4 shrink-0 rounded-sm border transition-colors ${selectedDotIds.includes(dot.id) ? "border-destructive bg-destructive text-destructive-foreground" : "border-border bg-background"}`}
                    onClick={() =>
                      setSelectedDotIds((prev) =>
                        prev.includes(dot.id) ? prev.filter((dotId) => dotId !== dot.id) : [...prev, dot.id],
                      )
                    }
                    aria-label={
                      selectedDotIds.includes(dot.id)
                        ? `Unselect ${dot.label} for batch delete`
                        : `Select ${dot.label} for batch delete`
                    }
                  >
                    {selectedDotIds.includes(dot.id) && <Check className="h-3 w-3" />}
                  </button>
                  {editingDotId === dot.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <Input
                        value={editingDotLabel}
                        onChange={(e) => {
                          if (e.target.value.length <= 24) {
                            setEditingDotLabel(e.target.value)
                          }
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            await confirmEditingDotLabel(dot)
                          }
                          if (e.key === "Escape") {
                            e.preventDefault()
                            cancelEditingDotLabel()
                          }
                        }}
                        autoFocus
                        maxLength={24}
                        className="h-6 text-xs"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => cancelEditingDotLabel()}
                        aria-label={`Cancel renaming ${dot.label}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={async () => {
                          await confirmEditingDotLabel(dot)
                        }}
                        aria-label={`Save renaming ${dot.label}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <p
                      className="truncate text-xs font-medium"
                      onDoubleClick={() => startEditingDotLabel(dot)}
                      title="Double-click to rename"
                    >
                      {dot.label}
                    </p>
                  )}
                  {editingDotPercentId === dot.id ? (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editingDotPercent}
                      onChange={(e) => setEditingDotPercent(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          await confirmEditingDotPercent(dot)
                        }
                        if (e.key === "Escape") {
                          e.preventDefault()
                          cancelEditingDotPercent()
                        }
                      }}
                      onBlur={async () => {
                        await confirmEditingDotPercent(dot)
                      }}
                      autoFocus
                      className="h-5 w-12 px-1 text-xs text-muted-foreground"
                    />
                  ) : (
                    <span
                      className="text-xs text-muted-foreground cursor-text select-none"
                      onDoubleClick={() => startEditingDotPercent(dot)}
                      title="Double-click to edit percentage"
                    >
                      {Math.round(dot.x)}%
                    </span>
                  )}
                </div>
                <div className="mb-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, dot.x))}%`, backgroundColor: dot.color }}
                  />
                </div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Select
                      value={dot.color}
                      onValueChange={(value) => updateDot(dot.id, { color: value })}
                    >
                      <SelectTrigger className="h-6 w-6 border-0 bg-transparent p-0 shadow-none">
                        <div
                          className="h-3 w-4 rounded-full border border-border"
                          style={{ backgroundColor: dot.color }}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {dotColorOptions.map((color, index) => (
                          <SelectItem key={color} value={color}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 w-4 rounded-full border border-border"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs">
                                {dotColorLabels[index]}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={dot.size.toString()}
                      onValueChange={(value) => updateDot(dot.id, { size: Number(value) })}
                    >
                      <SelectTrigger className="h-6 w-10 px-1 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative flex items-center gap-1" data-dot-action-root={dot.id}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setDotMenuOpen((prev) => (prev === dot.id ? null : dot.id))}
                      aria-label={`Open actions for ${dot.label}`}
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    {dotMenuOpen === dot.id && (
                      <div className="absolute right-0 top-7 z-20 min-w-[150px] rounded-md border border-border bg-background shadow-md">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-accent hover:text-accent-foreground"
                          onClick={async () => {
                            await updateDot(dot.id, { flag_for_today: !dot.flag_for_today })
                            setDotMenuOpen(null)
                          }}
                        >
                          <Flag className="h-3.5 w-3.5" />
                          {dot.flag_for_today ? "Unflag Today" : "Flag Today"}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-accent hover:text-accent-foreground"
                          onClick={async () => {
                            await updateDot(dot.id, { archived: true })
                            setDotMenuOpen(null)
                          }}
                        >
                          <ArchiveIcon className="h-3.5 w-3.5" />
                          Archive
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-destructive hover:bg-accent"
                          onClick={() => {
                            setDeleteConfirm({ dotId: dot.id, dotLabel: dot.label })
                            setDotMenuOpen(null)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>
          {totalDotsPages > 1 && (
            <div
              className="mt-2 flex items-center justify-center gap-1.5"
              role="tablist"
              aria-label="Dots pagination"
            >
              {Array.from({ length: totalDotsPages }, (_, index) => {
                const pageNumber = index + 1
                const isActivePage = pageNumber === currentDotsPage
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    role="tab"
                    aria-selected={isActivePage}
                    aria-label={`Go to dots page ${pageNumber}`}
                    onClick={() => setDotsPage(pageNumber)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${isActivePage
                      ? "w-5 bg-foreground"
                      : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                      }`}
                  />
                )
              })}
            </div>
          )}
          {archivedDots.length > 0 && (
            <>
              <div className="my-2 border-t border-border" />
              <div className="text-xs text-muted-foreground mb-1">Archived</div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                {archivedDots.map((dot: Dot) => (
                  <div
                    key={dot.id}
                    className="rounded-md border border-border bg-muted/40 p-2.5 opacity-65 grayscale shadow-[0px_4px_12px_0px_rgba(0,0,0,0.1)]"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-medium italic text-muted-foreground">{dot.label}</p>
                      <span className="text-xs text-muted-foreground">{Math.round(dot.x)}%</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 w-full px-2 text-[11px]"
                      onClick={async () => {
                        await updateDot(dot.id, { archived: false })
                      }}
                    >
                      <Undo2 className="mr-1 h-3.5 w-3.5" />
                      Unarchive
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Dot</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete &quot;{deleteConfirm.dotLabel}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Selected Dots</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete {batchDeleteConfirm.count} selected
              {batchDeleteConfirm.count === 1 ? " dot" : " dots"}? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBatchDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmBatchDelete}>
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Reset All Collections</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete all collections and snapshots? This action cannot be undone and
              will remove all your data.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (user) {
                    const success = await resetAllCollections(user.id)
                    if (success) {
                      // Clear all local state
                      setCollections([])
                      setSnapshotCollections([])
                      setOriginalCollections([])
                      setArchivedCollections([])
                      setSelectedCollection(null)
                      setShowResetConfirm(false)
                      // Show success message or redirect
                      console.log('All collections reset successfully')
                    } else {
                      console.error('Failed to reset collections')
                    }
                  }
                }}
              >
                Reset All
              </Button>
            </div>
          </div>
        </div>
      )}
      {showCreateCollectionModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Create Collection</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Enter a name for the new collection.
            </p>
            <Input
              value={newCollectionNameInput}
              onChange={(event) => setNewCollectionNameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleConfirmCreateCollectionFromSidebar()
                }
              }}
              placeholder="Collection name"
              autoFocus
              className="mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateCollectionModal(false)
                  setNewCollectionNameInput("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCreateCollectionFromSidebar}
                disabled={!newCollectionNameInput.trim()}
              >
                Create Collection
              </Button>
            </div>
          </div>
        </div>
      )}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Archive Collection</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Archive &quot;{archiveConfirm.collectionName}&quot;? You can restore it later from the archived collections section.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setArchiveConfirm(null)}>
                Cancel
              </Button>
              <Button onClick={confirmArchiveCollection}>
                Archive Collection
              </Button>
            </div>
          </div>
        </div>
      )}
      {deleteCollectionConfirm && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2 text-destructive">Delete Collection</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              <strong>This action cannot be undone.</strong> Delete &quot;{deleteCollectionConfirm.collectionName}&quot; and all its dots, snapshots, and data?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteCollectionConfirm(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteCollection}>
                Delete Forever
              </Button>
            </div>
          </div>
        </div>
      )}
      {collectionNameConflict && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Collection Name Already Exists</h3>
            {collectionNameConflict.type === 'active' ? (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  A collection named &quot;<strong>{collectionNameConflict.name}</strong>&quot; already exists and is currently active.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setCollectionNameConflict(null)}>
                    OK
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  A collection named &quot;<strong>{collectionNameConflict.name}</strong>&quot; already exists but is currently archived.
                  Would you like to unarchive it instead?
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setCollectionNameConflict(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUnarchiveFromConflict}>
                    <Undo2 className="w-4 h-4 mr-2" />
                    Unarchive Collection
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
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
      {showImportSuccess && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Import Successful</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your data has been imported successfully.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowImportSuccess(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {importError && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Import Error</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {importError}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setImportError(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {showArchivedCollectionsModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ArchiveIcon className="w-5 h-5" />
                Archived Collections
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowArchivedCollectionsModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {archivedCollections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArchiveIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No archived collections</p>
                <p className="text-sm mt-1">Collections you archive will appear here</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3">
                {archivedCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 text-muted-foreground min-w-0 flex-1">
                      <ArchiveIcon className="h-5 w-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium opacity-75 truncate">{collection.name}</p>
                        <p className="text-xs opacity-50">
                          {collection.dots.length} dot{collection.dots.length !== 1 ? 's' : ''}
                          {collection.archived_at && (
                            <span className="ml-2">
                              Archived {new Date(collection.archived_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleUnarchiveCollection(collection.id)
                          setShowArchivedCollectionsModal(false)
                        }}
                        title="Unarchive collection"
                        className="h-8"
                      >
                        <Undo2 className="w-4 h-4 mr-1" />
                        Unarchive
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteCollectionConfirm({
                            collectionId: collection.id,
                            collectionName: collection.name
                          })
                          setShowArchivedCollectionsModal(false)
                        }}
                        title="Delete collection permanently"
                        className="h-8 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Privacy Settings Modal */}
      {showPrivacySettings && (
        <PrivacySettings onClose={() => setShowPrivacySettings(false)} />
      )}

      {/* Color Settings Modal */}
      {showColorSettingsModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Color Settings</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColorSettingsModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Dot Colors</div>
                <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2">
                  {(
                    [
                      { key: "discovery", label: "Discovery" },
                      { key: "upslope", label: "On Track" },
                      { key: "dangerZone", label: "Blocked" },
                      { key: "downslope", label: "At Risk" },
                      { key: "done", label: "Done" },
                    ] as Array<{ key: keyof DotColorPreferences; label: string }>
                  ).map((dotColorSetting) => (
                    <label key={dotColorSetting.key} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                      <span>
                        {dotColorSetting.label}
                        {(dotColorSetting.key === "discovery" || dotColorSetting.key === "done") && (
                          <span className="ml-1 text-xs text-foreground">(required)</span>
                        )}
                      </span>
                      <input
                        type="color"
                        value={dotColors[dotColorSetting.key]}
                        onChange={(event) =>
                          setDotColors((previous) => ({
                            ...previous,
                            [dotColorSetting.key]: event.target.value,
                          }))
                        }
                        className="h-8 w-12 cursor-pointer rounded-md border border-border/70 bg-background/80 p-0 shadow-sm"
                      />
                    </label>
                  ))}
                  <button
                    onClick={handleResetDotColors}
                    className="w-full rounded-md border border-border/70 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Reset Dot Colors
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Background Gradient</div>
                <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2">
                  <label className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>Point A</span>
                    <input
                      type="color"
                      value={gradientStartColor}
                      onChange={(event) => handleGradientColorChange("start", event.target.value)}
                      className="h-8 w-12 cursor-pointer rounded-md border border-border/70 bg-background/80 p-0 shadow-sm"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>Point B</span>
                    <input
                      type="color"
                      value={gradientEndColor}
                      onChange={(event) => handleGradientColorChange("end", event.target.value)}
                      className="h-8 w-12 cursor-pointer rounded-md border border-border/70 bg-background/80 p-0 shadow-sm"
                    />
                  </label>
                  <button
                    onClick={handleResetGradientColors}
                    className="w-full rounded-md border border-border/70 bg-background/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Reset to Theme Defaults
                  </button>
                  <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                    <span>Split Fill (Point A/B)</span>
                    <Switch
                      checked={isSplitHillAreaFillEnabled}
                      onCheckedChange={setIsSplitHillAreaFillEnabled}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Release Line</div>
                {!selectedCollection ? (
                  <div className="text-sm text-muted-foreground rounded-md border border-border/70 bg-muted/30 p-3">
                    Select a collection to edit release line color settings.
                  </div>
                ) : isLoadingReleaseLineConfig ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-md border border-border/70 bg-muted/30 p-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Loading settings...
                  </div>
                ) : (
                  <div className="rounded-md border border-border/70 bg-muted/30 p-3">
                    <ReleaseLineSettings
                      config={releaseLineSettings[selectedCollection] || {
                        enabled: false,
                        color: "#ff00ff",
                        text: ""
                      }}
                      onConfigChange={handleReleaseLineConfigChange}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => setShowColorSettingsModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default HillChartApp 