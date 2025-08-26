# Technology Stack

## Frontend Framework
- **Next.js 15.2.4** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling with shadcn/ui components
- **Radix UI** primitives for accessible components

## Backend & Database
- **Supabase** (PostgreSQL, Auth, Row-Level Security, Storage)
- **Server-side API routes** in Next.js for auth endpoints

## Key Libraries
- **@supabase/supabase-js** - Database and auth client
- **next-themes** - Theme management
- **lucide-react** - Icon library
- **react-hook-form** with **zod** - Form validation
- **date-fns** - Date manipulation
- **HTML5 Canvas API** - PNG export functionality

## Development Tools
- **TypeScript** with strict mode
- **Playwright** for end-to-end testing
- **ESLint** for code linting
- **PostCSS** with Tailwind

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
```bash
npm run test         # Run Playwright tests
npm run test:headed  # Run tests with browser UI
npm run test:ui      # Run tests with Playwright UI
npm run test:debug   # Debug tests
```

### Database (Supabase)
```bash
supabase start       # Start local Supabase
supabase stop        # Stop local Supabase
supabase db reset    # Reset local database
supabase db push     # Push migrations to remote
```

## Configuration Files
- **components.json** - shadcn/ui configuration
- **tailwind.config.ts** - Tailwind CSS configuration with custom color system
- **next.config.mjs** - Next.js configuration with CSP headers and webpack optimizations
- **supabase/config.toml** - Supabase local development configuration