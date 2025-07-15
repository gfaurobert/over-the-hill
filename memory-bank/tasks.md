# Active Tasks

## Previous Task: SaaS Transformation with Supabase Backend and Auth

**Status**: ✅ COMPLETED
**Priority**: Critical
**Type**: Level 4 - Complex System

### Task Description

Transform Over The Hill from a single-user, LocalStorage-based app into a multi-tenant SaaS platform.

- Integrate Supabase for authentication and backend data storage.
- Implement sign-in (no public signup, only request access).
- Migrate all user data to Supabase with per-user isolation.
- Ensure all existing features work per-user.
- Provide secure, scalable, and maintainable architecture.

### Plan & Subtasks

#### A. Authentication & Access Control

- [X] Integrate Supabase Auth (email/password or magic link, no public signup)
- [X] Implement "Request Access" UI (user submits email, admin approves/invites)
- [X] Add sign-in page and auth gating to main UI

#### B. Data Model & Backend

- [X] Design Supabase schema for collections, dots, snapshots, etc.
- [X] Implement row-level security (RLS) for user data isolation
- [X] Set up Supabase client in Next.js app

#### C. Frontend Refactor

- [X] Replace LocalStorage logic with Supabase client calls
- [X] Add authentication state management (signed in/out, loading, etc.)
- [X] Update all data flows to be user-specific

#### E. Admin/Access Request Flow

- [X] "Request Access" form triggers email to admin or stores request in Supabase

#### F. Security & Testing

- [X] Enforce row-level security in Supabase
- [X] Test all flows: sign-in, data CRUD, access request, export

### CREATIVE Phase: UI/UX Design Plan

#### Key UX Flows

- Sign-in (no signup, only request access)
- Request Access (form, feedback, admin flow)
- Authenticated App Experience (user-specific data, sign-out)
- Import Data from JSON and store in DB (for existing users)
- Error/edge cases (access denied, pending approval, etc.)

#### UI Components Needed

- SignInForm (email/password or magic link)
- RequestAccessForm (email, message)
- AuthProvider/AuthContext (wraps app, manages auth state)
- ImportDataPrompt (modal/dialog)
- AccessStatus (pending/denied)
- SignOutButton

#### User Journey Examples

1. **New User**:

   - Visits site → sees Sign In + Request Access
   - Requests access → sees confirmation
   - Waits for admin approval
   - Gets invite, signs in, sees empty dashboard
2. **Existing User**:

   - Visits site, signs in
   - If LocalStorage data exists, prompted to import
   - Data is migrated, user continues as normal
3. **Unauthorized User**:

   - Tries to sign in before approval
   - Sees “Access Pending” or “Access Denied”

---

## New Epic: Port Key UI/UX Features from Web to Desktop App

**Goal:**
Port the following features from the web (main) branch to the desktop (desktop-app) branch, ensuring no backend/auth code is introduced and the Electron/local-files architecture is preserved.

### Tasks

1. **Synchronize Project Context**

   - [X] Copy `.cursor` and `memory-bank` from `main` to `desktop-app`.
5. **Remove Hardcoded Example Collections/Dots**

   - [X] Identify and remove hardcoded example data in `desktop-app`.
   - [X] Ensure app initializes with empty state or user files only.
   - [X] Test clean startup.
2. **Smoother Dragging of Dots**

   - [ ] Identify all code/UI changes related to dot dragging in `main`.
   - [ ] Port improvements to `desktop-app` (ensure local state only).
   - [ ] Test dragging in Electron.
3. **Better Calendar and Snapshots UX/UI**

   - [ ] Identify all calendar/snapshot UI/UX changes in `main`.
   - [ ] Port improvements to `desktop-app` (ensure local file usage).
   - [ ] Test snapshot/calendar features in Electron.
4. **Paypal Donation**

   - [ ] Identify Paypal donation code in `main`.
   - [ ] Port Paypal button/component to `desktop-app`.
   - [ ] Test Paypal flow in Electron.
6. **Integration & Testing**

   - [ ] Test each feature after porting.
   - [ ] Ensure no backend/auth code is present.
   - [ ] Verify UI/UX consistency with web app.
7. **Documentation**

   - [ ] Update documentation to reflect changes.
   - [ ] Mark tasks as complete in `tasks.md`.

---

## No active tasks. All major SaaS transformation work is complete.
