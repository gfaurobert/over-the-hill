## System Overview

Over The Hill is a Next.js App Router application centered on a single interactive hill-chart UI, with client-side Supabase access, encrypted domain data, and layered caching/session validation.

- Main runtime shape: `app/layout.tsx` wires global providers (`AuthProvider`, theme, service worker) and `app/page.tsx` conditionally renders auth surfaces or `components/HillChartApp.tsx`.
- Primary architecture style: client-heavy UI + service layer (`lib/services/*`) + Supabase tables/functions defined in `supabase/migrations/*`.
- Data sensitivity model: collection names, dot labels, snapshot payloads, and parts of preferences are encrypted via `lib/services/privacyService.ts` + DB RPCs (`encrypt_sensitive_data` / `decrypt_sensitive_data`).
- Session/security model: client auth state (`components/AuthProvider.tsx`) is augmented by server validation/refresh endpoints (`app/api/auth/validate/route.ts`, `app/api/auth/refresh/route.ts`) and edge proxy checks (`proxy.ts`).
- Caching model: app-level cache (`lib/services/cacheService.ts`), optional cached service wrapper (`lib/services/cachedDataService.ts`), plus static asset service worker cache (`public/sw.js`, `components/ServiceWorkerRegister.tsx`).

## Module Map

- **UI Shell & Entry**
  - `app/layout.tsx`
  - `app/page.tsx`
  - `components/HillChartApp.tsx`
  - `components/PrivacySettings.tsx`
  - `components/ReleaseLineSettings.tsx`

- **Authentication & Session Control**
  - `components/AuthProvider.tsx`
  - `lib/services/sessionValidationService.ts`
  - `app/api/auth/validate/route.ts`
  - `app/api/auth/refresh/route.ts`
  - `proxy.ts`

- **Domain Service Layer (Collections, Dots, Snapshots, Preferences)**
  - `lib/services/simpleDataService.ts` (fresh-data facade)
  - `lib/services/cachedDataService.ts` (cache-aware facade)
  - `lib/services/supabaseService.ts` (DB-facing core)
  - `lib/validation.ts` (input/domain validation and sanitization)

- **Privacy/Crypto**
  - `lib/services/privacyService.ts`
  - `app/api/auth/generate-key/route.ts`
  - `supabase/migrations/20250710091059_create_hill_chart_schema.sql`
  - `supabase/migrations/20250809105000_simplify_encryption_functions.sql`

- **Caching & Offline/Runtime Fetch**
  - `lib/services/cacheService.ts`
  - `lib/services/cacheInvalidationRules.ts`
  - `public/sw.js`
  - `components/ServiceWorkerRegister.tsx`

- **Data Schema & Persistence Evolution**
  - Baseline schema: `supabase/migrations/20250710091059_create_hill_chart_schema.sql`
  - Recent preference/today-color extensions:
    - `supabase/migrations/20260323103000_add_today_flag_to_dots.sql`
    - `supabase/migrations/20260323120000_add_user_display_preferences.sql`
    - `supabase/migrations/20260323133000_add_dot_color_preferences.sql`
    - `supabase/migrations/20260323203000_update_dot_color_defaults.sql`

- **Testing & Validation Surface**
  - Unit/integration: `lib/services/__tests__/*`, `components/*.test.tsx`, `lib/validation.test.ts`
  - Browser validation scripts: `scripts/playwright-stitch-validate.mjs`, `scripts/playwright-stitch-validate-profile.mjs`
  - QA scripts: `QA/scripts/*`

## Core Flows

- **Interactive chart data flow**
  - `app/page.tsx` -> `components/HillChartApp.tsx`
  - `HillChartApp` invokes service functions from `lib/services/simpleDataService.ts`
  - `simpleDataService` delegates to `lib/services/supabaseService.ts`
  - `supabaseService` validates (`lib/validation.ts`), encrypts/decrypts (`lib/services/privacyService.ts`), then persists through `lib/supabaseClient.ts` to Supabase tables (`collections`, `dots`, `snapshots`, `user_preferences`).

- **Encryption/decryption flow**
  - Write path: UI payload -> `supabaseService` -> `privacyService.encrypt*` -> DB RPC `encrypt_sensitive_data` or client crypto fallback -> encrypted columns.
  - Read path: DB rows -> `supabaseService` -> `privacyService.decrypt*` -> plain domain objects used by UI.
  - Key derivation path: `privacyService` may call `app/api/auth/generate-key/route.ts` for client-safe key derivation with `KEY_MATERIAL`.

- **Session validation/refresh flow**
  - `components/AuthProvider.tsx` tracks auth state and triggers validation.
  - `lib/services/sessionValidationService.ts` calls `/api/auth/validate`; on expiry/failure paths it can call `/api/auth/refresh`.
  - Server routes use service-role Supabase client for token/user verification.
  - `proxy.ts` performs route-level token checks and redirect decisions.

- **Cache coherence flow**
  - Optional cache path via `lib/services/cachedDataService.ts` uses `lib/services/cacheService.ts` (IndexedDB/localStorage, TTL, invalidation rules).
  - Mutation operations trigger cache invalidation + service worker invalidation messages.
  - Service worker (`public/sw.js`) caches static assets and excludes dynamic/API/auth traffic.

- **Import/export flow**
  - UI actions in `components/HillChartApp.tsx` / `components/PrivacySettings.tsx` call `importData`/export reads.
  - `lib/services/supabaseService.ts#importData` performs large batched encryption/upserts for collections, dots, snapshots.

## Ownership Zones

- **Product/UI Zone**
  - Ownership footprint: `components/*`, `app/page.tsx`
  - Main responsibility: chart interaction model, settings UX, auth screens, export/import UX.

- **Auth/Security Zone**
  - Ownership footprint: `components/AuthProvider.tsx`, `lib/services/sessionValidationService.ts`, `app/api/auth/*`, `proxy.ts`
  - Main responsibility: session validity, refresh lifecycle, key generation guardrails, route protection and request throttling.

- **Data Platform Zone**
  - Ownership footprint: `lib/services/supabaseService.ts`, `lib/services/simpleDataService.ts`, `lib/services/cachedDataService.ts`, `lib/validation.ts`
  - Main responsibility: domain CRUD semantics, validation boundaries, translation between UI models and DB rows.

- **Privacy/Crypto Zone**
  - Ownership footprint: `lib/services/privacyService.ts`, encryption SQL migrations
  - Main responsibility: per-user key derivation strategy, encryption/decryption mechanics, privacy-preserving hashing.

- **Storage/Offline Zone**
  - Ownership footprint: `lib/services/cacheService.ts`, `lib/services/cacheInvalidationRules.ts`, `public/sw.js`
  - Main responsibility: local cache lifecycle, invalidation logic, static asset offline behavior.

- **Database Schema Zone**
  - Ownership footprint: `supabase/migrations/*`
  - Main responsibility: table definitions, RLS policies, crypto functions, incremental schema evolution.

- **Quality/Automation Zone**
  - Ownership footprint: `lib/services/__tests__/*`, `components/*.test.tsx`, `scripts/*`, `QA/scripts/*`
  - Main responsibility: regression checks across service behavior, UI flows, and stitched/playwright validations.

## Hotspots

- `components/HillChartApp.tsx`
  - Largest concentration of UI state, interaction logic, and service orchestration; broad coupling to preferences, snapshots, import/export, and rendering behavior.

- `lib/services/supabaseService.ts`
  - Central domain backend adapter with high complexity: validation, encryption/decryption, ownership checks, batched import/upsert, and error handling.

- `lib/services/privacyService.ts`
  - High-sensitivity cryptographic/control-plane surface (key generation, fallback paths, dual runtime behavior, RPC + client crypto fallback).

- `components/AuthProvider.tsx` + `lib/services/sessionValidationService.ts` + `app/api/auth/validate/route.ts`
  - Multi-layer session orchestration (client state machine + server validation/refresh + retries/rate limits), creating cross-boundary coupling.

- `lib/services/cacheService.ts` + `lib/services/cachedDataService.ts` + `public/sw.js`
  - Overlapping cache layers (app data cache + service worker cache) with separate invalidation semantics and browser storage fallbacks.

- `proxy.ts`
  - Route-level security/rate-limit logic plus Supabase service-role token validation at edge boundary; affects all page navigation behavior.
