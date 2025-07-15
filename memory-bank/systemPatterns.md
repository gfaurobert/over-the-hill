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

### Import/Export Pattern
```typescript
// Export data structure
interface ExportData {
  collections: Collection[]
  snapshots: Snapshot[]
  exportDate: string
  version: string
}
```

## Performance Patterns
- **Efficient Rendering**: React state updates with minimal re-renders
- **Canvas Optimization**: Efficient SVG manipulation for exports
- **Memory Management**: Proper cleanup of event listeners and refs
- **Lazy Loading**: Component-based code splitting where applicable
