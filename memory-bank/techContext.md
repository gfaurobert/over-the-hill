# Technical Context

## Technology Stack
### Frontend Framework
- **Next.js 15.2.4**: React framework with App Router
- **React 19**: Latest React version with modern hooks
- **TypeScript**: Type-safe development environment

### Styling & UI
- **Tailwind CSS 3.4.17**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **Radix UI**: Accessible component primitives
- **next-themes**: Theme management (light/dark/system)

### Development Tools
- **pnpm**: Fast package manager
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## Dependencies Analysis
### Core Dependencies
```json
{
  "next": "15.2.4",
  "react": "^19",
  "react-dom": "^19",
  "typescript": "^5"
}
```

### UI Component Dependencies
```json
{
  "@radix-ui/react-*": "Various versions",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.5"
}
```

### Utility Dependencies
```json
{
  "date-fns": "4.1.0",
  "lucide-react": "^0.454.0",
  "react-hook-form": "^7.54.1",
  "zod": "^3.24.1"
}
```

## Project Structure
```
over-the-hill/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main application (1486 lines)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── theme-provider.tsx
├── lib/                  # Utility functions
├── public/               # Static assets
├── docs/                 # Documentation site
└── memory-bank/          # Memory Bank system
```

## Build Configuration
### Next.js Config
- **App Router**: Modern Next.js routing
- **TypeScript**: Full TypeScript support
- **Tailwind**: Integrated CSS framework
- **PostCSS**: CSS processing pipeline

### Development Scripts
```json
{
  "dev": "next dev",
  "build": "next build", 
  "start": "next start",
  "lint": "next lint"
}
```

## Performance Characteristics
- **Bundle Size**: Optimized with Next.js
- **Rendering**: Server-side rendering capabilities
- **Caching**: Next.js built-in caching
- **Code Splitting**: Automatic code splitting

## Development Environment
- **Node.js**: Modern Node.js version
- **pnpm**: Fast, disk space efficient package manager
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement

## Deployment
- **Static Export**: Capable of static site generation
- **Vercel**: Optimized for Vercel deployment
- **Environment**: Production-ready configuration
