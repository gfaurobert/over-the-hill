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
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useTheme } from "next-themes"
import SignOutButton from "./SignOutButton"
import { useAuth } from "./AuthProvider"
import { PrivacySettings } from "./PrivacySettings"
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
} from "@/lib/services/supabaseService"

export interface Dot {
  id: string
  label: string
  x: number
  y: number
  color: string
  size: number
  archived: boolean // always present
}

export interface Collection {
  id: string
  name: string
  status: 'active' | 'archived' | 'deleted'
  archived_at?: string
  deleted_at?: string
  dots: Dot[]
}

export interface Snapshot {
  date: string
  collectionId: string
  collectionName: string
  dots: Dot[]
  timestamp: number
}

export interface ExportData {
  collections: Collection[]
  snapshots: Snapshot[]
  exportDate: string
  version: string
}

const defaultColors = ["#3b82f6", "#22c55e", "#ef4444", "#f97316", "#8b5cf6"]

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
            {defaultColors.map((color, index) => (
              <SelectItem key={color} value={color}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">
                    {['Blue', 'Green', 'Red', 'Orange', 'Purple'][index]}
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
  const [newDotLabel, setNewDotLabel] = useState("")
  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [collectionInput, setCollectionInput] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ dotId: string; dotLabel: string } | null>(null)
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false)
  const { theme, setTheme } = useTheme()
  const ellipsisMenuRef = useRef<HTMLDivElement>(null)
  
  // Add click-outside-to-close behavior for main ellipsis menu
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ellipsisMenuRef.current &&
        !ellipsisMenuRef.current.contains(e.target as Node)
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

  // Collection editing state
  const [isEditingCollection, setIsEditingCollection] = useState(false)
  const [editingCollectionName, setEditingCollectionName] = useState("")
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Add state to track which dot is being edited
  const [editingDotId, setEditingDotId] = useState<string | null>(null)

  // Add state to track which dot's menu is open
  const [dotMenuOpen, setDotMenuOpen] = useState<string | null>(null)

  // Add state to track import success
  const [showImportSuccess, setShowImportSuccess] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.id) {
      console.log('[HILL_CHART] Loading collections for user:', user.id)
      
      // Fetch active collections
      fetchCollections(user.id, false).then((activeCollections) => {
        console.log('[HILL_CHART] Loaded active collections:', activeCollections.length)
        setCollections(activeCollections)
        setOriginalCollections(activeCollections)
        if (activeCollections.length > 0 && !selectedCollection) {
          setSelectedCollection(activeCollections[0].id)
          setCollectionInput(activeCollections[0].name)
        }
      }).catch((error) => {
        console.error('[HILL_CHART] Failed to fetch active collections:', error)
      })
      
      // Fetch archived collections
      fetchCollections(user.id, true).then((allCollections) => {
        const archived = allCollections.filter(c => c.status === 'archived')
        console.log('[HILL_CHART] Loaded archived collections:', archived.length)
        setArchivedCollections(archived)
      }).catch((error) => {
        console.error('[HILL_CHART] Failed to fetch archived collections:', error)
      })
      
      // Fetch snapshots
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
    }
    // Don't clear data when user is undefined (loading state)
  }, [user]) // Removed selectedCollection dependency to prevent unnecessary refetching

  // Reset snapshot success state after 3 seconds
  useEffect(() => {
    if (snapshotSuccess) {
      const timer = setTimeout(() => {
        setSnapshotSuccess(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [snapshotSuccess])

  const filteredCollections = collections.filter((c) => c.name.toLowerCase().includes(collectionInput.toLowerCase()))
  const currentCollection = collections.find((c) => c.id === selectedCollection)

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
        // Update the actual dot position in collections
        updateDot(draggingDot.id, { x: draggingDot.x, y: draggingDot.y })
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
      color: defaultColors[0],
      size: 3,
      archived: false,
    }
    
    try {
      const addedDot = await addDotService(newDot, selectedCollection, user.id)
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

  const confirmDelete = async () => {
    if (deleteConfirm && selectedCollection && user) {
      const { success } = await deleteDotService(deleteConfirm.dotId, user.id)
      if (success) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === selectedCollection ? { ...c, dots: c.dots.filter((d) => d.id !== deleteConfirm.dotId) } : c,
          ),
        )
      }
      setDeleteConfirm(null)
    }
  }

  // Archive operation handlers
  const handleArchiveCollection = async (collectionId: string) => {
    if (!user) return
    
    const success = await archiveCollection(collectionId, user.id)
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
    
    const success = await unarchiveCollection(collectionId, user.id)
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
    
    const success = await deleteCollection(collectionId, user.id)
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
          const added = await addCollection(newCollection, user.id)
          if (added) {
            console.log('[HILL_CHART] Collection created successfully:', added)
            // Update local state immediately
            setCollections((prev) => [...prev, added])
            setSelectedCollection(added.id)
            setCollectionInput(added.name)
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
    // @ts-ignore
    ctx.letterSpacing = "0px"
    // @ts-ignore
    ctx.wordSpacing = "0px"
    // @ts-ignore
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
    // @ts-ignore
    ctx.letterSpacing = "0px"
    // @ts-ignore
    ctx.wordSpacing = "0px"
    // @ts-ignore
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
      dots: collection.dots.map(dot => ({
        id: dot.id,
        label: dot.label, // This is already decrypted
        x: dot.x,
        y: dot.y,
        color: dot.color,
        size: dot.size,
        archived: Boolean(dot.archived) // Ensure it's a boolean
      }))
    }))

    // Clean snapshots data
    const cleanSnapshots = snapshots.map(snapshot => ({
      date: snapshot.date,
      collectionId: snapshot.collectionId,
      collectionName: snapshot.collectionName, // Already decrypted
      dots: snapshot.dots.map(dot => ({
        id: dot.id,
        label: dot.label, // Already decrypted
        x: dot.x,
        y: dot.y,
        color: dot.color,
        size: dot.size,
        archived: Boolean(dot.archived)
      })),
      timestamp: snapshot.timestamp
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
        const importedCollections = await importData(data, user.id)
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
    const success = await updateCollection(editingCollectionId, trimmedName, user.id)
    
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
    const dotsWithArchived = currentCollection.dots.map(dot => ({
      ...dot,
      archived: dot.archived // force boolean
    }))

    try {
      const success = await createSnapshot(
        user.id,
        currentCollection.id,
        currentCollection.name,
        dotsWithArchived
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
    } catch (error) {
      console.error("Error viewing snapshot:", error)
    }
  }

  const handleViewLive = () => {
    // Restore original collections
    setCollections(originalCollections)
    setSelectedCollection(originalCollections[0]?.id || null)
    setCollectionInput(originalCollections[0]?.name || "")
    setCurrentSnapshot(null)
    setIsViewingSnapshot(false)
    setSelectedSnapshot(null)
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
              ${
                isSelected
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
              className={`w-full flex items-center gap-2 transition-all duration-300 ${
                snapshotSuccess
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

  // Before rendering the dot list, define activeDots and archivedDots
  const activeDots: Dot[] = (currentCollection?.dots || []).filter((dot: Dot) => !dot.archived);
  const archivedDots: Dot[] = (currentCollection?.dots || []).filter((dot: Dot) => dot.archived);

  return (
    <div className="min-h-screen p-4 bg-transparent" style={{ userSelect: isDragging ? "none" : "auto" }}>
      <div className="max-w-screen-2xl mx-auto space-y-6">
        {/* Main Chart Area */}
        <div className="grid grid-cols-1 lg:grid-cols-[2.4fr_1.2fr] gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="h-[600px]">
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
              <div className="relative w-full h-full bg-background -m-2 flex items-center justify-center">
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  viewBox="-50 -100 700 180" // Moved chart down by using negative Y offset
                  className="overflow-visible max-w-full"
                  style={{ userSelect: isDragging ? "none" : "auto" }}
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
                  <line
                    className="leading-3"
                    x1="0"
                    y1="150"
                    x2="600"
                    y2="150"
                    stroke="currentColor"
                    strokeWidth="1"
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
                            detectCollisions({...current, y: testY}, placed)
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
                      const dotRadius = 4 + dot.size * 2;
                      
                      // Use draggingDot for immediate feedback if this dot is being dragged with null safety
                      const isBeingDragged = draggingDot?.id === dot.id;
                      const displayX = isBeingDragged && draggingDot ? (draggingDot.x / 100) * 600 : dotX;
                      const displayY = isBeingDragged && draggingDot ? draggingDot.y : dot.y;

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
                            fill={dot.color}
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
                            fill="hsl(var(--background))"
                            stroke="hsl(var(--border))"
                            strokeWidth="1"
                            opacity={opacity}
                            className="pointer-events-none"
                          />
                          <text
                            x={labelPos.textCenterX}
                            y={labelPos.y + labelPos.height / 2}
                            textAnchor="middle"
                            className="fill-foreground pointer-events-none select-none"
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

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="h-[600px]">
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
                    <div className="py-1">
                      {/* Account Section */}
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                        Account
                      </div>
                      {/* Username Display */}
                      <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
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
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative" ref={dropdownRef}>
                <label className="text-sm font-medium mb-2 block">Collections</label>
                <div className="relative">
                  {isEditingCollection ? (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={editInputRef}
                        value={editingCollectionName}
                        onChange={(e) => setEditingCollectionName(e.target.value)}
                        onKeyDown={handleEditKeyPress}
                        className="flex-1"
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
                    <div className="relative">
                      <Input
                        ref={inputRef}
                        value={collectionInput}
                        onChange={handleInputChange}
                        onKeyPress={handleCollectionInputKeyPress}
                        onFocus={handleInputFocus}
                        placeholder="Type to search or create collection..."
                        className="pr-16"
                      />
                      <div className="absolute right-0 top-0 h-full flex items-center gap-1">
                        {selectedCollection && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-full px-2"
                              onClick={() => {
                                const collection = collections.find(c => c.id === selectedCollection)
                                if (collection) {
                                  startEditCollection(collection)
                                }
                              }}
                              title="Edit collection name"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-full px-2"
                              onClick={() => {
                                const collection = collections.find(c => c.id === selectedCollection)
                                if (collection) {
                                  setArchiveConfirm({ 
                                    collectionId: collection.id, 
                                    collectionName: collection.name 
                                  })
                                }
                              }}
                              title="Archive collection"
                            >
                              <ArchiveIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-full px-2 text-destructive"
                              onClick={() => {
                                const collection = collections.find(c => c.id === selectedCollection)
                                if (collection) {
                                  setDeleteCollectionConfirm({ 
                                    collectionId: collection.id, 
                                    collectionName: collection.name 
                                  })
                                }
                              }}
                              title="Delete collection"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-full px-2"
                          onClick={toggleDropdown}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {showDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCollections.length > 0 ? (
                      filteredCollections.map((collection) => (
                        <div
                          key={collection.id}
                          className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                          onClick={() => handleCollectionSelect(collection)}
                        >
                          {collection.name}
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
        </div>
      </div>
      </div>

      {/* Dots Section - Full width below both chart and sidebar */}
      <Card className="max-w-[1540px] mx-auto mt-7">
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
            onChange={(e) => {
              if (e.target.value.length <= 24) {
                setNewDotLabel(e.target.value)
              }
            }}
            onFocus={() => setEditingDotId(null)}
            onKeyPress={(e) => e.key === "Enter" && addDot()}
            maxLength={24}
          />
          {newDotLabel.length === 24 && editingDotId === null && (
            <div className="text-xs text-red-500 mt-1">Dot name cannot exceed 24 characters.</div>
          )}

          <div className="space-y-2">
            {activeDots.map((dot: Dot) => (
              <DotRow
                key={dot.id}
                dot={dot}
                dotMenuOpen={dotMenuOpen}
                setDotMenuOpen={setDotMenuOpen}
                setDeleteConfirm={setDeleteConfirm}
                updateDot={updateDot}
                editingDotId={editingDotId}
                setEditingDotId={setEditingDotId}
              />
            ))}
          </div>
          {archivedDots.length > 0 && (
            <>
              <div className="border-t border-border my-2" />
              <div className="text-xs text-muted-foreground mb-1">Archived</div>
              {archivedDots.map((dot: Dot) => (
                <div key={dot.id} className="p-3 bg-muted/50 rounded-lg space-y-3 opacity-60 italic">
                  <div className="flex items-center gap-2">
                    <Input value={dot.label} disabled className="text-sm flex-1 italic" />
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDotMenuOpen(dotMenuOpen === dot.id ? null : dot.id)}
                        className="h-8 w-8 p-0 border-muted hover:border-accent hover:bg-accent/20"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {dotMenuOpen === dot.id && (
                        <div className="absolute right-0 top-9 z-50 bg-background border border-border rounded shadow-lg min-w-[140px]">
                          <button
                            className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-accent hover:text-accent-foreground"
                            onClick={async () => {
                              setDotMenuOpen(null)
                              await updateDot(dot.id, { archived: false })
                            }}
                          >
                            <Undo2 className="w-4 h-4 text-muted-foreground" /> Unarchive
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Dot</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete "{deleteConfirm.dotLabel}"? This action cannot be undone.
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
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Archive Collection</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Archive "{archiveConfirm.collectionName}"? You can restore it later from the archived collections section.
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2 text-destructive">Delete Collection</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              <strong>This action cannot be undone.</strong> Delete "{deleteCollectionConfirm.collectionName}" and all its dots, snapshots, and data?
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Collection Name Already Exists</h3>
            {collectionNameConflict.type === 'active' ? (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  A collection named "<strong>{collectionNameConflict.name}</strong>" already exists and is currently active.
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
                  A collection named "<strong>{collectionNameConflict.name}</strong>" already exists but is currently archived. 
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
      {showImportSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                      <ArchiveIcon className="w-5 h-5 flex-shrink-0" />
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
                    <div className="flex gap-2 flex-shrink-0">
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
    </div>
  )
}
export default HillChartApp 