# Design Document

## Overview

This design document outlines the systematic refactoring of the Over The Hill codebase to address critical code quality issues. The refactoring will transform a monolithic 2854-line component into a well-architected, maintainable system while preserving all existing functionality. The approach emphasizes incremental changes, comprehensive testing, and backward compatibility.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     HillChartApp (Container)                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────────┐ │
│  │  Error Boundary │ │   Auth Context  │ │ Theme Context │ │
│  └─────────────────┘ └─────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ HillChart    │ │ Collection  │ │ Snapshot   │
        │ Component    │ │ Manager     │ │ Manager    │
        └──────────────┘ └─────────────┘ └────────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐
        │ Dot Manager  │ │ Custom      │ │ Service    │
        │              │ │ Hooks       │ │ Layer      │
        └──────────────┘ └─────────────┘ └────────────┘
```

### Component Hierarchy

```
HillChartApp/
├── components/
│   ├── HillChart/
│   │   ├── HillChart.tsx
│   │   ├── HillChartSVG.tsx
│   │   ├── DotRenderer.tsx
│   │   └── ReleaseLineRenderer.tsx
│   ├── CollectionManager/
│   │   ├── CollectionManager.tsx
│   │   ├── CollectionList.tsx
│   │   ├── CollectionForm.tsx
│   │   └── CollectionActions.tsx
│   ├── DotManager/
│   │   ├── DotManager.tsx
│   │   ├── DotList.tsx
│   │   ├── DotForm.tsx
│   │   └── DotActions.tsx
│   ├── SnapshotManager/
│   │   ├── SnapshotManager.tsx
│   │   ├── SnapshotList.tsx
│   │   └── SnapshotActions.tsx
│   └── common/
│       ├── ErrorBoundary.tsx
│       ├── LoadingSpinner.tsx
│       └── VirtualizedList.tsx
├── hooks/
│   ├── useCollections.ts
│   ├── useDots.ts
│   ├── useSnapshots.ts
│   ├── useReleaseLineSettings.ts
│   └── usePerformanceOptimization.ts
├── services/
│   ├── CollectionService.ts
│   ├── DotService.ts
│   ├── SnapshotService.ts
│   └── CacheService/
│       ├── CacheManager.ts
│       ├── StorageBackend.ts
│       └── InvalidationRules.ts
└── types/
    ├── collection.types.ts
    ├── dot.types.ts
    ├── snapshot.types.ts
    └── common.types.ts
```

## Components and Interfaces

### Core Component Interfaces

```typescript
// Main container component
interface HillChartAppProps {
  onResetPassword: () => void
}

// Chart visualization component
interface HillChartProps {
  dots: Dot[]
  selectedDot?: string
  isDragging: boolean
  releaseLineConfig?: ReleaseLineConfig
  onDotMove: (dotId: string, x: number, y: number) => void
  onDotSelect: (dotId: string) => void
  onDotDeselect: () => void
}

// Collection management component
interface CollectionManagerProps {
  collections: Collection[]
  selectedCollection: string | null
  archivedCollections: Collection[]
  onCollectionSelect: (collectionId: string) => void
  onCollectionCreate: (collection: Omit<Collection, 'id' | 'dots'>) => Promise<void>
  onCollectionUpdate: (collectionId: string, updates: Partial<Collection>) => Promise<void>
  onCollectionArchive: (collectionId: string) => Promise<void>
  onCollectionDelete: (collectionId: string) => Promise<void>
}

// Dot management component
interface DotManagerProps {
  dots: Dot[]
  collectionId: string
  onDotCreate: (dot: Omit<Dot, 'id'>) => Promise<void>
  onDotUpdate: (dotId: string, updates: Partial<Dot>) => Promise<void>
  onDotDelete: (dotId: string) => Promise<void>
  onDotArchive: (dotId: string) => Promise<void>
}

// Snapshot management component
interface SnapshotManagerProps {
  snapshots: Snapshot[]
  currentCollection: Collection | null
  onSnapshotCreate: () => Promise<void>
  onSnapshotLoad: (snapshotId: string) => Promise<void>
  onSnapshotDelete: (snapshotId: string) => Promise<void>
}
```

### Custom Hook Interfaces

```typescript
// Collections hook
interface UseCollectionsReturn {
  collections: Collection[]
  archivedCollections: Collection[]
  selectedCollection: string | null
  loading: boolean
  error: string | null
  actions: {
    selectCollection: (id: string) => void
    createCollection: (collection: Omit<Collection, 'id' | 'dots'>) => Promise<void>
    updateCollection: (id: string, updates: Partial<Collection>) => Promise<void>
    archiveCollection: (id: string) => Promise<void>
    unarchiveCollection: (id: string) => Promise<void>
    deleteCollection: (id: string) => Promise<void>
  }
}

// Dots hook
interface UseDotsReturn {
  dots: Dot[]
  loading: boolean
  error: string | null
  actions: {
    createDot: (dot: Omit<Dot, 'id'>) => Promise<void>
    updateDot: (id: string, updates: Partial<Dot>) => Promise<void>
    deleteDot: (id: string) => Promise<void>
    archiveDot: (id: string) => Promise<void>
    moveDot: (id: string, x: number, y: number) => void
  }
}

// Performance optimization hook
interface UsePerformanceOptimizationReturn {
  memoizedComponents: {
    MemoizedDot: React.ComponentType<DotProps>
    MemoizedCollectionItem: React.ComponentType<CollectionItemProps>
  }
  callbacks: {
    debouncedUpdateDot: (id: string, updates: Partial<Dot>) => void
    memoizedHandleDotMove: (id: string, x: number, y: number) => void
  }
  values: {
    hillChartPath: string
    chartDimensions: ChartDimensions
  }
}
```

### Service Layer Interfaces

```typescript
// Collection service
interface ICollectionService {
  getCollections(userId: string, includeArchived?: boolean): Promise<Collection[]>
  createCollection(collection: Collection, userId: string): Promise<Collection>
  updateCollection(id: string, updates: Partial<Collection>, userId: string): Promise<boolean>
  archiveCollection(id: string, userId: string): Promise<boolean>
  unarchiveCollection(id: string, userId: string): Promise<boolean>
  deleteCollection(id: string, userId: string): Promise<boolean>
}

// Dot service
interface IDotService {
  createDot(dot: Dot, collectionId: string, userId: string): Promise<Dot>
  updateDot(dot: Dot, userId: string): Promise<Dot>
  deleteDot(dotId: string, userId: string): Promise<boolean>
  archiveDot(dotId: string, userId: string): Promise<boolean>
}

// Snapshot service
interface ISnapshotService {
  createSnapshot(data: SnapshotData, userId: string): Promise<boolean>
  getSnapshots(userId: string): Promise<Snapshot[]>
  loadSnapshot(snapshotId: string, userId: string): Promise<Snapshot | null>
  deleteSnapshot(snapshotId: string, userId: string): Promise<boolean>
}
```

## Data Models

### Enhanced Type Definitions

```typescript
// Strict collection types with discriminated unions
interface BaseCollection {
  id: string
  name: string
  dots: Dot[]
  releaseLineConfig?: ReleaseLineConfig
  created_at: string
  updated_at: string
}

interface ActiveCollection extends BaseCollection {
  status: 'active'
  archived_at?: never
  deleted_at?: never
}

interface ArchivedCollection extends BaseCollection {
  status: 'archived'
  archived_at: string
  deleted_at?: never
}

type Collection = ActiveCollection | ArchivedCollection

// Enhanced dot type with validation
interface Dot {
  id: string
  label: string
  x: number // 0-100 percentage
  y: number // SVG coordinate -10 to 150
  color: HexColor
  size: DotSize
  archived: boolean
  created_at: string
  updated_at: string
}

// Strict type constraints
type HexColor = `#${string}` // Template literal type for hex colors
type DotSize = 1 | 2 | 3 | 4 | 5 // Union type for valid sizes

// Error types
abstract class AppError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number
  abstract readonly isOperational: boolean
}

class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400
  readonly isOperational = true
  
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR'
  readonly statusCode = 500
  readonly isOperational = true
  
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'NetworkError'
  }
}

class CacheError extends AppError {
  readonly code = 'CACHE_ERROR'
  readonly statusCode = 500
  readonly isOperational = true
  
  constructor(message: string, public cacheOperation?: string) {
    super(message)
    this.name = 'CacheError'
  }
}
```

## Error Handling

### Error Boundary Strategy

```typescript
// Main error boundary for the entire app
class HillChartErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    this.logErrorToService(error, errorInfo)
    this.setState({ errorInfo })
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Integration with error monitoring (Sentry, LogRocket, etc.)
    console.error('React Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    return this.props.children
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }
}

// Specialized error boundaries for different sections
class ChartErrorBoundary extends React.Component {
  // Handles chart-specific errors with chart fallback UI
}

class DataErrorBoundary extends React.Component {
  // Handles data loading errors with retry mechanisms
}
```

### Centralized Error Handling

```typescript
// Error handler utility
class ErrorHandler {
  static handleServiceError(error: unknown, context: string): never {
    if (error instanceof ValidationError) {
      throw error // Re-throw validation errors as-is
    }
    
    if (error instanceof NetworkError) {
      throw new AppError(
        'Network request failed. Please check your connection.',
        'NETWORK_ERROR',
        500
      )
    }
    
    if (error instanceof CacheError) {
      // Log cache errors but don't fail the operation
      console.warn(`Cache operation failed in ${context}:`, error.message)
      throw new AppError(
        'Data storage temporarily unavailable.',
        'CACHE_ERROR',
        503
      )
    }
    
    // Unknown error
    console.error(`Unknown error in ${context}:`, error)
    throw new AppError(
      'An unexpected error occurred. Please try again.',
      'UNKNOWN_ERROR',
      500
    )
  }

  static handleAsyncError(error: unknown, operation: string): void {
    // For fire-and-forget operations that shouldn't throw
    console.error(`Async operation failed: ${operation}`, error)
    // Could send to error reporting service here
  }
}
```

## Testing Strategy

### Testing Architecture

```
tests/
├── unit/
│   ├── components/
│   │   ├── HillChart.test.tsx
│   │   ├── CollectionManager.test.tsx
│   │   └── DotManager.test.tsx
│   ├── hooks/
│   │   ├── useCollections.test.ts
│   │   └── useDots.test.ts
│   └── services/
│       ├── CollectionService.test.ts
│       └── DotService.test.ts
├── integration/
│   ├── HillChartApp.integration.test.tsx
│   ├── CollectionWorkflow.test.tsx
│   └── SnapshotWorkflow.test.tsx
├── accessibility/
│   ├── KeyboardNavigation.test.tsx
│   └── ScreenReader.test.tsx
└── performance/
    ├── RenderPerformance.test.tsx
    └── MemoryLeaks.test.tsx
```

### Test Utilities

```typescript
// Custom render function with providers
function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions = {}
) {
  const AllProviders = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <ThemeProvider>
        <HillChartErrorBoundary>
          {children}
        </HillChartErrorBoundary>
      </ThemeProvider>
    </AuthProvider>
  )

  return render(ui, { wrapper: AllProviders, ...options })
}

// Mock factories for test data
class TestDataFactory {
  static createCollection(overrides: Partial<Collection> = {}): Collection {
    return {
      id: 'test-collection-1',
      name: 'Test Collection',
      status: 'active',
      dots: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }

  static createDot(overrides: Partial<Dot> = {}): Dot {
    return {
      id: 'test-dot-1',
      label: 'Test Dot',
      x: 50,
      y: 75,
      color: '#3b82f6',
      size: 3,
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    }
  }
}

// Performance testing utilities
class PerformanceTestUtils {
  static async measureRenderTime(component: React.ReactElement): Promise<number> {
    const start = performance.now()
    render(component)
    const end = performance.now()
    return end - start
  }

  static async measureMemoryUsage(operation: () => void): Promise<number> {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
    operation()
    await new Promise(resolve => setTimeout(resolve, 100)) // Allow GC
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
    return finalMemory - initialMemory
  }
}
```

## Performance Optimizations

### Memoization Strategy

```typescript
// Memoized components
const MemoizedDot = React.memo<DotProps>(
  ({ dot, onMove, onSelect, isSelected, isDragging }) => {
    // Dot rendering logic
  },
  (prevProps, nextProps) => {
    // Custom comparison function
    return (
      prevProps.dot.id === nextProps.dot.id &&
      prevProps.dot.x === nextProps.dot.x &&
      prevProps.dot.y === nextProps.dot.y &&
      prevProps.dot.color === nextProps.dot.color &&
      prevProps.dot.size === nextProps.dot.size &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isDragging === nextProps.isDragging
    )
  }
)

// Memoized calculations
const useHillChartCalculations = () => {
  const hillChartPath = useMemo(
    () => generateBellCurvePath(600, 150, 300),
    [] // Never changes
  )

  const chartDimensions = useMemo(
    () => ({ width: 600, height: 180, centerX: 300 }),
    []
  )

  const getHillY = useCallback((x: number) => {
    const { width, height, centerX } = chartDimensions
    const baseY = 145
    const svgX = (x / 100) * width
    const normalizedX = (svgX - centerX) / (width / 6)
    return baseY - height * Math.exp(-0.5 * normalizedX * normalizedX)
  }, [chartDimensions])

  return { hillChartPath, chartDimensions, getHillY }
}

// Debounced operations
const useDebouncedOperations = () => {
  const debouncedUpdateDot = useMemo(
    () => debounce((dotId: string, updates: Partial<Dot>) => {
      // Update dot logic
    }, 300),
    []
  )

  const debouncedSaveSnapshot = useMemo(
    () => debounce(() => {
      // Auto-save snapshot logic
    }, 5000),
    []
  )

  return { debouncedUpdateDot, debouncedSaveSnapshot }
}
```

### Virtual Scrolling Implementation

```typescript
// Virtual list for large datasets
const VirtualizedCollectionList: React.FC<VirtualizedListProps> = ({
  collections,
  onCollectionSelect,
  selectedCollection
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <CollectionItem
        collection={collections[index]}
        isSelected={selectedCollection === collections[index].id}
        onSelect={onCollectionSelect}
      />
    </div>
  )

  return (
    <FixedSizeList
      height={400}
      itemCount={collections.length}
      itemSize={60}
      overscanCount={5} // Render 5 extra items for smooth scrolling
    >
      {Row}
    </FixedSizeList>
  )
}
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
1. Create new directory structure
2. Extract type definitions
3. Implement error boundaries
4. Set up testing infrastructure

### Phase 2: Service Layer (Week 3-4)
1. Refactor cache service into smaller classes
2. Create dedicated service classes
3. Implement proper error handling
4. Add comprehensive service tests

### Phase 3: Custom Hooks (Week 5-6)
1. Extract state management into custom hooks
2. Implement performance optimizations
3. Add hook tests
4. Update existing components to use hooks

### Phase 4: Component Splitting (Week 7-8)
1. Create new component structure
2. Migrate functionality incrementally
3. Maintain backward compatibility
4. Add component tests

### Phase 5: Performance & Accessibility (Week 9-10)
1. Implement virtual scrolling
2. Add accessibility features
3. Performance testing and optimization
4. Accessibility testing

### Phase 6: Integration & Cleanup (Week 11-12)
1. Integration testing
2. Performance benchmarking
3. Documentation updates
4. Final cleanup and optimization

## Rollback Strategy

### Rollback Plan
1. **Feature Flags**: Use feature flags to toggle between old and new implementations
2. **Gradual Migration**: Migrate components one at a time with fallback options
3. **Monitoring**: Implement comprehensive monitoring to detect issues early
4. **Quick Rollback**: Maintain ability to quickly revert to previous version
5. **Data Compatibility**: Ensure all data formats remain compatible

### Risk Mitigation
1. **Comprehensive Testing**: 90%+ test coverage before deployment
2. **Staged Deployment**: Deploy to staging environment first
3. **User Acceptance Testing**: Test with real users before full rollout
4. **Performance Monitoring**: Monitor performance metrics during migration
5. **Error Tracking**: Enhanced error tracking during transition period