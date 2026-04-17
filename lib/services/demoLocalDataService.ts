import type { Collection, Dot, ReleaseLineConfig, Snapshot } from "@/components/HillChartApp"

interface DemoUserPreferences {
  selectedCollectionId: string | null
  collectionInput: string
  hideCollectionName: boolean
  copyFormat: "PNG" | "SVG"
  gradientStartColor: string | null
  gradientEndColor: string | null
  dotColorDiscovery: string
  dotColorUpslope: string
  dotColorDangerZone: string
  dotColorDownslope: string
  dotColorDone: string
  splitHillAreaFillEnabled: boolean
  showTodayCollection: boolean
}

interface DemoData {
  collections: Collection[]
  snapshots: Snapshot[]
  preferences: Record<string, DemoUserPreferences>
  releaseLineConfig: Record<string, Record<string, ReleaseLineConfig>>
}

const STORAGE_KEY = "oth-demo-runtime-v2"

const defaultPreferences: DemoUserPreferences = {
  selectedCollectionId: null,
  collectionInput: "",
  hideCollectionName: false,
  copyFormat: "PNG",
  gradientStartColor: null,
  gradientEndColor: null,
  dotColorDiscovery: "#b0cdfb",
  dotColorUpslope: "#a6e7be",
  dotColorDangerZone: "#f8b4b4",
  dotColorDownslope: "#fcc7a1",
  dotColorDone: "#d0bdfb",
  splitHillAreaFillEnabled: false,
  showTodayCollection: true,
}

const defaultDemoCollections: Collection[] = [
  {
    id: "demo-launch-readiness",
    name: "Launch Readiness",
    status: "active",
    dots: [
      { id: "demo-dot-messaging", label: "Messaging", x: 25, y: 96.3, color: "#b0cdfb", size: 6, archived: false },
      { id: "demo-dot-signup", label: "Signup Flow", x: 47, y: 0, color: "#a6e7be", size: 6, archived: false },
      { id: "demo-dot-alerting", label: "Alerting", x: 58, y: 11.32, color: "#f8b4b4", size: 6, archived: false },
      { id: "demo-dot-analytics", label: "Analytics", x: 77, y: 104.62, color: "#d0bdfb", size: 6, archived: false },
    ],
  },
  {
    id: "demo-q2-objectives",
    name: "Q2 Objectives",
    status: "active",
    dots: [
      { id: "demo-dot-api-latency", label: "API Latency", x: 18, y: 121.25, color: "#b0cdfb", size: 6, archived: false },
      { id: "demo-dot-mobile-polish", label: "Mobile Polish", x: 38, y: 29.25, color: "#a6e7be", size: 6, archived: false },
      { id: "demo-dot-export-flow", label: "Export Flow", x: 62, y: 29.25, color: "#fcc7a1", size: 6, archived: false },
      { id: "demo-dot-team-rollout", label: "Team Rollout", x: 84, y: 126.28, color: "#d0bdfb", size: 6, archived: false },
    ],
  },
]

function getInitialData(): DemoData {
  return {
    collections: defaultDemoCollections.map((collection) => normalizeCollection(collection)),
    snapshots: [],
    preferences: {},
    releaseLineConfig: {},
  }
}

function normalizeCollection(collection: Collection): Collection {
  return {
    ...collection,
    status: collection.status ?? "active",
    dots: (collection.dots ?? []).map((dot) => ({
      ...dot,
      archived: Boolean(dot.archived),
      size: typeof dot.size === "number" ? dot.size : 6,
    })),
  }
}

function normalizeSnapshot(snapshot: Snapshot): Snapshot {
  return {
    ...snapshot,
    dots: (snapshot.dots ?? []).map((dot) => ({
      ...dot,
      archived: Boolean(dot.archived),
      size: typeof dot.size === "number" ? dot.size : 6,
    })),
    timestamp: typeof snapshot.timestamp === "number" ? snapshot.timestamp : Date.now(),
  }
}

function readData(): DemoData {
  if (typeof window === "undefined") return getInitialData()

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) return getInitialData()

  try {
    const parsed = JSON.parse(stored) as Partial<DemoData>
    return {
      collections: (parsed.collections ?? []).map(normalizeCollection),
      snapshots: (parsed.snapshots ?? []).map(normalizeSnapshot),
      preferences: parsed.preferences ?? {},
      releaseLineConfig: parsed.releaseLineConfig ?? {},
    }
  } catch {
    return getInitialData()
  }
}

function writeData(data: DemoData): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function persist(mutator: (data: DemoData) => void): DemoData {
  const data = readData()
  mutator(data)
  writeData(data)
  return data
}

function uniqueId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

function sortCollections(collections: Collection[]): Collection[] {
  return [...collections].sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchCollections(_userId: string, includeArchived: boolean = false): Promise<Collection[]> {
  const data = readData()
  if (includeArchived) return sortCollections(data.collections)
  return sortCollections(data.collections.filter((collection) => collection.status === "active"))
}

export async function addCollection(_userId: string, name: string, id?: string): Promise<Collection | null> {
  const newCollection: Collection = {
    id: id ?? uniqueId(),
    name,
    status: "active",
    dots: [],
  }
  persist((data) => {
    data.collections.push(newCollection)
  })
  return newCollection
}

export async function updateCollection(_userId: string, collectionId: string, updates: Partial<Collection>): Promise<boolean> {
  let didUpdate = false
  persist((data) => {
    data.collections = data.collections.map((collection) => {
      if (collection.id !== collectionId) return collection
      didUpdate = true
      return normalizeCollection({ ...collection, ...updates })
    })
  })
  return didUpdate
}

export async function archiveCollection(_userId: string, collectionId: string): Promise<boolean> {
  return updateCollection(_userId, collectionId, { status: "archived", archived_at: new Date().toISOString() })
}

export async function unarchiveCollection(_userId: string, collectionId: string): Promise<boolean> {
  return updateCollection(_userId, collectionId, { status: "active", archived_at: undefined })
}

export async function deleteCollection(_userId: string, collectionId: string): Promise<boolean> {
  let didDelete = false
  persist((data) => {
    const nextCollections = data.collections.filter((collection) => collection.id !== collectionId)
    didDelete = nextCollections.length !== data.collections.length
    data.collections = nextCollections
    data.snapshots = data.snapshots.filter((snapshot) => snapshot.collectionId !== collectionId)
    for (const userConfig of Object.values(data.releaseLineConfig)) delete userConfig[collectionId]
  })
  return didDelete
}

export async function addDot(_userId: string, collectionId: string, dot: Omit<Dot, "id">): Promise<Dot | null> {
  const newDot: Dot = { ...dot, id: uniqueId(), archived: Boolean(dot.archived) }
  let wasAdded = false
  persist((data) => {
    data.collections = data.collections.map((collection) => {
      if (collection.id !== collectionId) return collection
      wasAdded = true
      return { ...collection, dots: [...collection.dots, newDot] }
    })
  })
  return wasAdded ? newDot : null
}

export async function updateDot(dot: Dot, _userId: string): Promise<Dot | null> {
  let updatedDot: Dot | null = null
  persist((data) => {
    data.collections = data.collections.map((collection) => ({
      ...collection,
      dots: collection.dots.map((currentDot) => {
        if (currentDot.id !== dot.id) return currentDot
        updatedDot = { ...dot, archived: Boolean(dot.archived) }
        return updatedDot
      }),
    }))
  })
  return updatedDot
}

export async function deleteDot(_userId: string, collectionId: string, dotId: string): Promise<boolean> {
  let didDelete = false
  persist((data) => {
    data.collections = data.collections.map((collection) => {
      if (collection.id !== collectionId) return collection
      const nextDots = collection.dots.filter((dot) => dot.id !== dotId)
      didDelete = nextDots.length !== collection.dots.length
      return { ...collection, dots: nextDots }
    })
  })
  return didDelete
}

export async function createSnapshot(
  _userId: string,
  collectionId: string,
  collectionName: string,
  dots: Dot[],
  releaseLineConfig?: ReleaseLineConfig,
): Promise<boolean> {
  const date = new Date()
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const snapshot: Snapshot = {
    date: localDate,
    collectionId,
    collectionName,
    dots: dots.map((dot) => ({ ...dot })),
    timestamp: Date.now(),
    ...(releaseLineConfig ? { releaseLineConfig } : {}),
  }

  persist((data) => {
    data.snapshots = data.snapshots.filter((item) => item.date !== localDate || item.collectionId !== collectionId)
    data.snapshots.push(snapshot)
  })
  return true
}

export async function fetchSnapshots(_userId: string): Promise<Snapshot[]> {
  return [...readData().snapshots].sort((a, b) => b.timestamp - a.timestamp)
}

export async function loadSnapshot(_userId: string, snapshotId: string): Promise<Snapshot | null> {
  const snapshots = readData().snapshots
  return snapshots.find((snapshot) => snapshot.date === snapshotId || String(snapshot.timestamp) === snapshotId) ?? null
}

export async function fetchUserPreferences(userId: string): Promise<DemoUserPreferences | null> {
  const preferences = readData().preferences[userId]
  return preferences ? { ...defaultPreferences, ...preferences } : null
}

export async function updateUserPreferences(userId: string, preferences: Partial<DemoUserPreferences>): Promise<boolean> {
  persist((data) => {
    const current = data.preferences[userId] ?? defaultPreferences
    data.preferences[userId] = { ...current, ...preferences }
  })
  return true
}

export async function importData(_userId: string, dataToImport: unknown): Promise<Collection[]> {
  const incoming = (dataToImport as { collections?: Collection[]; snapshots?: Snapshot[] }) ?? {}
  const importedCollections = (incoming.collections ?? []).map(normalizeCollection)
  const importedSnapshots = (incoming.snapshots ?? []).map(normalizeSnapshot)

  persist((data) => {
    data.collections = importedCollections
    data.snapshots = importedSnapshots
  })
  return importedCollections
}

export async function resetAllCollections(_userId: string): Promise<boolean> {
  persist((data) => {
    data.collections = []
    data.snapshots = []
  })
  return true
}

export async function updateCollectionReleaseLineConfig(
  userId: string,
  collectionId: string,
  config: ReleaseLineConfig,
): Promise<boolean> {
  persist((data) => {
    if (!data.releaseLineConfig[userId]) data.releaseLineConfig[userId] = {}
    data.releaseLineConfig[userId][collectionId] = config
  })
  return true
}

export async function getCollectionReleaseLineConfig(
  userId: string,
  collectionId: string,
): Promise<ReleaseLineConfig | null> {
  const releaseLineConfig = readData().releaseLineConfig[userId]?.[collectionId]
  return releaseLineConfig ?? null
}
