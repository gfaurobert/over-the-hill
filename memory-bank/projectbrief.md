# Over The Hill - Project Brief

## Project Overview
**Over The Hill** is a Next.js web application that implements a Hill Chart visualization tool, inspired by 37signals' Hill Charts methodology. The application allows users to create, manage, and visualize project progress using an intuitive bell curve interface.

## Core Purpose
- Visualize project progress using Hill Charts (bell curve visualization)
- Track tasks and features through "Up the Hill" (discovery) and "Down the Hill" (delivery) phases
- Provide an intuitive drag-and-drop interface for progress management
- Support multiple collections and snapshots for comprehensive project tracking

## Key Features
1. **Hill Chart Visualization**: Bell curve interface with drag-and-drop dot positioning
2. **Collection Management**: Multiple project collections with independent dot sets
3. **Dot Customization**: Color coding (blue, green, red, orange, purple) and size options (1-5)
4. **Export Capabilities**: PNG and SVG export with clipboard support
5. **Snapshot System**: Calendar-based snapshot creation and restoration
6. **Theme Support**: Light, dark, and system theme options
7. **Data Persistence**: LocalStorage-based data persistence
8. **Import/Export**: JSON-based data import/export functionality

## Technical Stack
- **Framework**: Next.js 15.2.4 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React useState hooks with localStorage persistence
- **UI Components**: Radix UI primitives with custom styling
- **Export**: HTML5 Canvas API for PNG generation, SVG manipulation
- **Theme**: next-themes for theme management

## Current Implementation Status
- ✅ Core Hill Chart visualization with bell curve
- ✅ Drag-and-drop dot positioning
- ✅ Collection management system
- ✅ Dot customization (color, size, label)
- ✅ Export functionality (PNG/SVG)
- ✅ Theme switching
- ✅ Snapshot system with calendar
- ✅ LocalStorage persistence
- ✅ Import/Export functionality

## Project Structure
- Single-page application with main chart area and sidebar
- Modular component architecture using shadcn/ui
- Responsive design with grid layout
- Comprehensive state management for collections, dots, and snapshots

## Development Status
The application is fully functional with all core features implemented. The codebase is well-structured and follows modern React/Next.js patterns.

## Live Demo
Available at: https://over-the-hill.faurobert.fr/

## Documentation
Available at: https://gfaurobert.github.io/over-the-hill/
