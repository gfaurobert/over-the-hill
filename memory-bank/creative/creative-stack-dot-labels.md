# Creative Phase: Stack Overlapping Dot Names

## Visual Design Specification

### 🎨 Design Approach: Clean Vertical Stacking
**Selected Option**: Clean upward stacking with consistent spacing and subtle hierarchy cues

### 📐 Visual Architecture

#### Spacing System
- **Base Position**: `dotY - 35px` (unchanged for first label)
- **Stack Increment**: `-(textHeight + 8px)` for each collision
- **Minimum Gap**: 8px between stacked labels
- **Responsive Spacing**: 4px minimum, 10px maximum based on available space

#### Visual Stack Example
```
┌─────────────────┐  ← y = dotY - 86 (3rd level)
│   Third Label   │    opacity: 0.95, border: lighter
└─────────────────┘
         ↑ 8px gap
┌─────────────────┐  ← y = dotY - 51 (2nd level)  
│   Second Label  │    opacity: 0.97, border: standard
└─────────────────┘
         ↑ 8px gap
┌─────────────────┐  ← y = dotY - 35 (1st level)
│   Primary Label │    opacity: 1.0, border: standard
└─────────────────┘
         ↑ 
       ●  ← Dot position
```

### 🎨 Visual Enhancements

#### Hierarchy Indicators
- **Primary Label**: Full opacity (1.0), standard border
- **2nd Level**: 97% opacity, standard border  
- **3rd+ Levels**: 95% opacity, slightly lighter border color
- **Purpose**: Subtle depth indication without visual distraction

#### Interactive States
- **Hover**: Highlight both dot and its label simultaneously
- **Drag**: Labels maintain stacking while following dot movement
- **Focus**: Visual connection preserved across all interaction states

### 📱 Responsive Design

#### Spacing Adaptation
```typescript
const getStackSpacing = (availableHeight: number, stackCount: number): number => {
  const idealSpacing = 8
  const minSpacing = 4
  const maxSpacing = 10
  
  const requiredHeight = stackCount * (textHeight + idealSpacing)
  return availableHeight < requiredHeight ? minSpacing : idealSpacing
}
```

#### Screen Size Behavior
- **Desktop**: Full 8px spacing, comfortable reading
- **Tablet**: Adaptive 6-8px spacing based on density
- **Mobile**: Minimum 4px spacing, maintained readability

### 🎭 User Experience Goals

#### Readability Priorities
1. **No Overlapping Text**: All labels fully readable
2. **Clear Association**: Visual connection to dots maintained
3. **Consistent Styling**: Matches existing design language
4. **Responsive Behavior**: Works across all device sizes

#### Visual Harmony
- **Color Scheme**: Use existing CSS variables (`--background`, `--border`, `--foreground`)
- **Border Radius**: Maintain `rx="8" ry="8"` rounded corners
- **Typography**: Preserve dynamic font sizing (`8 + dot.size * 1`)
- **Spacing**: Consistent with existing UI patterns

### 🔧 Implementation Specifications

#### CSS Variables Usage
- **Background**: `fill="hsl(var(--background))"`
- **Border**: `stroke="hsl(var(--border))"`  
- **Text**: `className="fill-foreground"`
- **Hierarchy**: Programmatic opacity adjustment

#### Animation Considerations
- **Smooth Transitions**: Labels smoothly move to stacked positions
- **Drag Behavior**: Maintain existing drag smoothness
- **Hover Effects**: Consistent with current hover states

### 🎯 Success Criteria

#### Visual Quality
- ✅ All labels readable in stacked configuration
- ✅ Clear visual hierarchy without distraction
- ✅ Consistent with existing design system
- ✅ Smooth interactions across all states

#### User Experience  
- ✅ Intuitive label-to-dot association
- ✅ Preserved drag and drop functionality
- ✅ Responsive behavior across screen sizes
- ✅ No performance impact on chart rendering

## Creative Decision: Clean Vertical Stacking

**Rationale**: Provides optimal readability while maintaining design simplicity and implementation efficiency. The subtle hierarchy through opacity creates depth without visual noise, and the spatial proximity maintains clear dot-label relationships.

**Next Phase**: IMPLEMENT - Ready to code the visual stacking system with these specifications.
