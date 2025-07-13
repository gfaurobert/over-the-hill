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
- [x] Integrate Supabase Auth (email/password or magic link, no public signup)
- [x] Implement "Request Access" UI (user submits email, admin approves/invites)
- [x] Add sign-in page and auth gating to main UI

#### B. Data Model & Backend
- [x] Design Supabase schema for collections, dots, snapshots, etc.
- [x] Implement row-level security (RLS) for user data isolation
- [x] Set up Supabase client in Next.js app

#### C. Frontend Refactor
- [x] Replace LocalStorage logic with Supabase client calls
- [x] Add authentication state management (signed in/out, loading, etc.)
- [x] Update all data flows to be user-specific

#### E. Admin/Access Request Flow
- [x] "Request Access" form triggers email to admin or stores request in Supabase

#### F. Security & Testing
- [x] Enforce row-level security in Supabase
- [x] Test all flows: sign-in, data CRUD, access request, export

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

## No active tasks. All major SaaS transformation work is complete.
