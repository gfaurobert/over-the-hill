# System Patterns

## Architecture Patterns
### Component Structure
- **Single Page Application**: Main chart area + sidebar layout
- **Component Composition**: shadcn/ui components with custom styling
- **State Management**: React hooks with localStorage persistence
- **Responsive Design**: Grid-based layout with mobile considerations

### Data Flow Patterns
1. **State Updates**: Centralized state management in main component
2. **Persistence**: LocalStorage synchronization on state changes
3. **Event Handling**: Drag-and-drop, form inputs, button interactions
4. **Export Processing**: Canvas/SVG manipulation for file generation

## Code Patterns
### State Management
```typescript
// Collection state pattern
const [collections, setCollections] = useState<Collection[]>([])
const [selectedCollection, setSelectedCollection] = useState("")

// Dot management pattern
const updateDotLabel = (dotId: string, newLabel: string) => {
  setCollections((prev) =>
    prev.map((collection) => ({
      ...collection,
      dots: collection.dots.map((dot) => 
        dot.id === dotId ? { ...dot, label: newLabel } : dot
      ),
    }))
  )
}
```

### Event Handling Patterns
```typescript
// Drag and drop pattern
const handleDotDrag = (dotId: string, clientX: number, clientY: number, rect: DOMRect) => {
  // Calculate position and update state
}

// Form input pattern
const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  // Update state and trigger side effects
}
```

### Export Patterns
```typescript
// PNG export pattern
const copyChartAsPNG = async () => {
  // Canvas manipulation and clipboard API
}

// SVG export pattern
const copyChartAsSVG = async () => {
  // SVG string manipulation and clipboard API
}
```

## UI Patterns
### Layout Pattern
- **Grid Layout**: Main chart (2.4fr) + Sidebar (1.2fr)
- **Card Components**: Consistent card-based UI sections
- **Responsive Design**: Mobile-first with breakpoint considerations

### Interaction Patterns
- **Drag and Drop**: SVG-based dot positioning
- **Form Controls**: Input fields with real-time updates
- **Modal Dialogs**: Confirmation and info modals
- **Dropdown Menus**: Collection and option selection

### Modal Management Pattern
```typescript
// Modal state management
const [showArchivedCollectionsModal, setShowArchivedCollectionsModal] = useState(false)

// Modal with professional design and actions
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
    {/* Modal content with scrollable area */}
  </div>
</div>

// Menu integration pattern
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
```

### Confirmation Dialog Pattern
```typescript
// Multi-purpose confirmation state
const [deleteConfirm, setDeleteConfirm] = useState<{ 
  collectionId: string; 
  collectionName: string 
} | null>(null)

// Confirmation dialog with clear actions
{deleteConfirm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
      <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        Are you sure you want to permanently delete "{deleteConfirm.collectionName}"?
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={confirmDelete}>
          Delete Permanently
        </Button>
      </div>
    </div>
  </div>
)}
```

## Data Patterns
### Storage Pattern
```typescript
// LocalStorage persistence pattern
const saveToStorage = () => {
  localStorage.setItem("hill-chart-collections", JSON.stringify(collections))
  localStorage.setItem("hill-chart-snapshots", JSON.stringify(snapshots))
  // ... other state items
}
```

### Collection Management Pattern
```typescript
// Collection interface with status management
interface Collection {
  id: string
  name: string
  status: 'active' | 'archived' | 'deleted'
  archived_at?: string
  deleted_at?: string
  dots: Dot[]
}

// Service layer pattern for CRUD operations
export const archiveCollection = async (collectionId: string, userId: string): Promise<boolean> => {
  // Database update with validation
  // Error handling with user feedback
  // Return success status
}

// State management pattern for collection lifecycle
const [collections, setCollections] = useState<Collection[]>([])
const [archivedCollections, setArchivedCollections] = useState<Collection[]>([])

// Optimistic UI updates pattern
const handleArchiveCollection = async (collectionId: string) => {
  const collectionToArchive = collections.find(c => c.id === collectionId)
  if (!collectionToArchive) return

  // Optimistic update
  setCollections(prev => prev.filter(c => c.id !== collectionId))
  setArchivedCollections(prev => [...prev, { ...collectionToArchive, status: 'archived' }])

  // Async database operation
  const success = await archiveCollection(collectionId, user.id)
  if (!success) {
    // Revert on failure
    setCollections(prev => [...prev, collectionToArchive])
    setArchivedCollections(prev => prev.filter(c => c.id !== collectionId))
  }
}
```

### Database Pattern
```typescript
// Status enum with timestamp tracking
ALTER TABLE collections
ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived', 'deleted')),
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

// Trigger pattern for automated timestamp management
CREATE OR REPLACE FUNCTION handle_collection_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'archived' AND OLD.status != 'archived' THEN
        NEW.archived_at = NOW();
    END IF;
    IF NEW.status = 'active' AND OLD.status = 'archived' THEN
        NEW.archived_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Import/Export Pattern
```typescript
// Export data structure with backward compatibility
interface ExportData {
  collections: Collection[]
  snapshots: Snapshot[]
  exportDate: string
  version: string
}

// Import validation with status handling
const validateImportData = (data: any): ValidationResult => {
  // Filter out deleted collections
  if (data.collections) {
    data.collections = data.collections.filter((c: any) => c.status !== 'deleted')
  }
  // Default to active status for backward compatibility
  data.collections = data.collections.map((c: any) => ({
    ...c,
    status: c.status || 'active'
  }))
}
```

## Performance Patterns
- **Efficient Rendering**: React state updates with minimal re-renders
- **Canvas Optimization**: Efficient SVG manipulation for exports
- **Memory Management**: Proper cleanup of event listeners and refs
- **Lazy Loading**: Component-based code splitting where applicable
