# Project Structure

## Root Directory Layout
```
├── app/                    # Next.js App Router pages and API routes
├── components/             # React components
├── lib/                    # Utility functions and services
├── public/                 # Static assets
├── supabase/              # Database migrations and configuration
├── docs/                  # Hugo-based documentation site
├── QA/                    # Test scripts and assets
├── memory-bank/           # Project documentation and context
└── deploy/                # Deployment configuration
```

## Key Directories

### `/app` - Next.js App Router
- **`/api`** - Server-side API routes for authentication and user management
- **`/login`**, **`/invite`**, **`/reset-password`** - Authentication pages
- **`globals.css`** - Global styles and CSS variables
- **`layout.tsx`** - Root layout with providers
- **`page.tsx`** - Main application page

### `/components` - React Components
- **`/ui`** - shadcn/ui components (Button, Card, Input, etc.)
- **`HillChartApp.tsx`** - Main application component
- **`AuthProvider.tsx`** - Authentication context provider
- **Authentication components** - SignInForm, SignOutButton, etc.
- **Feature components** - PrivacySettings, ImportDataPrompt, etc.

### `/lib` - Utilities and Services
- **`/services`** - Business logic services (privacy, session validation, Supabase)
- **`/security`** - Security utilities and import validation
- **`supabaseClient.ts`** - Supabase client configuration
- **`utils.ts`** - General utility functions
- **`validation.ts`** - Data validation schemas

### `/supabase` - Database
- **`/migrations`** - SQL migration files
- **`config.toml`** - Local development configuration
- **`seed.sql`** - Database seed data

## File Naming Conventions
- **React components**: PascalCase (e.g., `HillChartApp.tsx`)
- **Pages**: lowercase with hyphens (e.g., `reset-password/page.tsx`)
- **Utilities**: camelCase (e.g., `supabaseClient.ts`)
- **API routes**: lowercase (e.g., `generate-key/route.ts`)

## Import Aliases
- **`@/components`** - Components directory
- **`@/lib`** - Library directory
- **`@/lib/utils`** - Utility functions
- **`@/components/ui`** - UI components

## Special Directories
- **`memory-bank/`** - Project context, progress tracking, and documentation
- **`QA/`** - Automated test scripts with Playwright
- **`docs/`** - Hugo static site for documentation
- **`.yoyo/`** - Backup and snapshot system