# Design Document

## Overview

The Release Line feature adds a vertical milestone indicator to the hill chart visualization. This feature integrates with the existing collection-based data model, following the same encryption and privacy patterns used throughout the application. The release line will be positioned at the right edge of the hill chart and include customizable visual properties (color, text) that are stored per collection.

## Architecture

### Data Model Extensions

The release line configuration will be stored as part of the Collection data structure. We'll extend the existing Collection interface to include release line settings:

```typescript
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
  dots: Dot[]
  releaseLineConfig?: ReleaseLineConfig // New field
}
```

### Database Schema

The release line configuration will be stored in the existing `collections` table as an encrypted JSON field:

```sql
-- Add new column to collections table
ALTER TABLE collections ADD COLUMN release_line_config_encrypted TEXT;
```

The encrypted data will contain:
- `enabled`: boolean flag for visibility
- `color`: hex color code (e.g., "#ff00ff")
- `text`: user-defined label text

### Encryption Strategy

Following the existing privacy patterns in the codebase:
- Release line text will be encrypted using the same method as collection names and dot labels
- Color values will also be encrypted to maintain complete privacy
- The encryption will use the existing `privacyService` infrastructure

## Components and Interfaces

### UI Components

#### 1. Release Line Settings Panel
Location: Integrated into the main ellipsis menu in `HillChartApp.tsx`

Components needed:
- Toggle switch for enable/disable
- Color picker component (similar to dot color selection)
- Text input field for label editing

#### 2. Release Line Visualization
Location: Added to the SVG rendering in the hill chart

Visual specifications:
- Vertical line positioned at x=600 (right edge of chart)
- Line extends as high as the top of the hill (y=20 to y=80)
- Text positioned at the top of the line
- Configurable stroke color and width

### State Management

The release line state will be managed within the existing `HillChartApp` component state:

```typescript
// Add to existing state in HillChartApp
const [releaseLineSettings, setReleaseLineSettings] = useState<{
  [collectionId: string]: ReleaseLineConfig
}>({})
```

### Service Layer Integration

#### Data Service Extensions
Extend `simpleDataService.ts` to handle release line operations:

```typescript
// New methods to add
async updateCollectionReleaseLineConfig(
  userId: string, 
  collectionId: string, 
  config: ReleaseLineConfig
): Promise<boolean>

async getCollectionReleaseLineConfig(
  userId: string, 
  collectionId: string
): Promise<ReleaseLineConfig | null>
```

#### Supabase Service Extensions
Extend `supabaseService.ts` to handle encrypted storage:

```typescript
// Handle encryption/decryption of release line config
const encryptReleaseLineConfig = async (config: ReleaseLineConfig, userId: string) => {
  return {
    enabled: config.enabled, // Boolean doesn't need encryption
    color_encrypted: await privacyService.encryptData(config.color, userId),
    text_encrypted: await privacyService.encryptData(config.text, userId)
  }
}
```

## Data Models

### Release Line Configuration Schema

```typescript
interface ReleaseLineConfig {
  enabled: boolean        // Toggle state
  color: string          // Hex color code (e.g., "#ff00ff")
  text: string           // User-defined label text (max 50 characters)
}

interface EncryptedReleaseLineConfig {
  enabled: boolean
  color_encrypted: string
  text_encrypted: string
}
```

### Database Storage Format

```json
{
  "enabled": true,
  "color_encrypted": "encrypted_hex_color_value",
  "text_encrypted": "encrypted_label_text"
}
```

### Export/Import Format

For JSON export/import, the release line config will be included in the collection data:

```json
{
  "collections": [
    {
      "id": "collection_id",
      "name": "Collection Name",
      "dots": [...],
      "releaseLineConfig": {
        "enabled": true,
        "color": "#ff00ff",
        "text": "Q4 2024"
      }
    }
  ]
}
```

## Error Handling

### Validation Rules
- Text length: Maximum 50 characters
- Color format: Valid hex color codes only
- Graceful degradation when release line config is missing or corrupted

### Error Recovery
- Default values when config is invalid:
  - `enabled`: false
  - `color`: "#ff00ff" (magenta, high contrast)
  - `text`: ""

### Migration Strategy
- Existing collections without release line config will use default values
- No database migration required - new field is optional

## Testing Strategy

### Unit Tests
1. **Release Line Config Validation**
   - Test color format validation
   - Test text length limits
   - Test encryption/decryption roundtrip

2. **Data Service Tests**
   - Test CRUD operations for release line config
   - Test error handling for invalid data
   - Test integration with existing collection operations

3. **Component Tests**
   - Test toggle functionality
   - Test color picker integration
   - Test text input validation
   - Test visual rendering with different configurations

### Integration Tests
1. **Export/Import Tests**
   - Test release line config inclusion in exports
   - Test proper restoration from imports
   - Test handling of legacy data without release line config

2. **Snapshot Tests**
   - Test release line state preservation in snapshots
   - Test restoration from snapshots with release line data

3. **Privacy Tests**
   - Test encryption of release line data
   - Test proper decryption on data retrieval
   - Test data isolation between users

### Visual Tests
1. **SVG Export Tests**
   - Test release line inclusion in PNG exports
   - Test release line inclusion in SVG exports
   - Test proper positioning and styling

2. **Responsive Design Tests**
   - Test release line positioning across different screen sizes
   - Test text readability and positioning

## Implementation Considerations

### Performance
- Release line rendering is lightweight (single SVG line + text)
- Encryption/decryption overhead is minimal for small config objects
- No impact on existing chart performance

### Accessibility
- Release line text will include proper ARIA labels
- Color picker will be keyboard accessible
- High contrast color options available

### Browser Compatibility
- SVG rendering is supported in all modern browsers
- Color picker uses standard HTML5 input type="color"
- Graceful fallback for older browsers

### Responsive Design
- Release line scales with chart dimensions
- Text positioning adapts to available space
- Mobile-friendly touch interactions for settings