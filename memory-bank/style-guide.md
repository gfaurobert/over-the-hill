# Style Guide

## Code Style
### TypeScript
- **Strict Mode**: Enable strict TypeScript configuration
- **Interface Naming**: PascalCase for interfaces (e.g., `Dot`, `Collection`)
- **Type Safety**: Comprehensive type definitions for all data structures
- **Generic Types**: Use generics for reusable components

### React Patterns
- **Functional Components**: Use functional components with hooks
- **State Management**: useState for local state, localStorage for persistence
- **Event Handling**: Proper TypeScript event types
- **Refs**: useRef for DOM element references

## Component Structure
### File Organization
```
components/
├── ui/                   # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── select.tsx
└── theme-provider.tsx    # Theme management
```

### Component Patterns
```typescript
// Component structure pattern
export default function ComponentName() {
  // State declarations
  const [state, setState] = useState()
  
  // Event handlers
  const handleEvent = () => {
    // Event logic
  }
  
  // Render
  return (
    <div>
      {/* JSX content */}
    </div>
  )
}
```

## Styling Guidelines
### Tailwind CSS
- **Utility Classes**: Prefer Tailwind utility classes
- **Custom Classes**: Use @apply for complex styles
- **Responsive Design**: Mobile-first responsive classes
- **Dark Mode**: Support for dark mode variants

### Component Styling
```typescript
// Button styling pattern
<Button 
  variant="outline" 
  size="sm" 
  className="custom-classes"
>
  Button Text
</Button>

// Card styling pattern
<Card className="h-full">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

## State Management
### State Structure
```typescript
// Collection state pattern
interface Collection {
  id: string
  name: string
  dots: Dot[]
}

// Dot state pattern
interface Dot {
  id: string
  label: string
  x: number
  y: number
  color: string
  size: number
}
```

### State Updates
```typescript
// Immutable state updates
const updateState = (id: string, newValue: string) => {
  setState(prev => prev.map(item => 
    item.id === id ? { ...item, value: newValue } : item
  ))
}
```

## Error Handling
### Try-Catch Patterns
```typescript
// LocalStorage operations
try {
  const data = JSON.parse(localStorage.getItem('key') || '{}')
} catch (error) {
  console.error('Error loading data:', error)
}
```

## Performance Guidelines
- **Memoization**: Use React.memo for expensive components
- **Event Optimization**: Debounce user input when necessary
- **Canvas Operations**: Optimize SVG manipulations
- **State Updates**: Minimize unnecessary re-renders

## Accessibility
- **ARIA Labels**: Proper accessibility attributes
- **Keyboard Navigation**: Support keyboard interactions
- **Color Contrast**: Ensure sufficient color contrast
- **Screen Readers**: Semantic HTML structure
