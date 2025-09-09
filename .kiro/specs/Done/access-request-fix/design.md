# Design Document

## Problem Analysis

The access request functionality is failing with a 409 Conflict error because:

1. The `RequestAccessForm` component is trying to insert a `message` field directly into the `access_requests` table
2. The database schema expects a `message_encrypted` field instead
3. The message needs to be encrypted using the `PrivacyService` before storage
4. There's no API route to handle the encryption logic server-side

## Solution Design

### 1. Create Access Request API Route

Create a new API route at `/app/api/access-request/route.ts` that:
- Accepts email and message from the form
- Stores the message as plain text in `message_encrypted` field (encryption not needed for public access requests)
- Inserts the data with the correct column name (`message_encrypted`)
- Handles duplicate email constraint violations gracefully
- Returns appropriate success/error responses

### 2. Update RequestAccessForm Component

Modify the form to:
- Call the new API route instead of direct Supabase insertion
- Handle the API response properly
- Show better error messages for common scenarios (duplicate email, etc.)

### 3. Handle Edge Cases

- Empty message handling (store as empty string)
- Duplicate email submissions (409 conflicts)
- Network errors
- Invalid email formats

## Implementation Plan

### Step 1: Create API Route
- File: `app/api/access-request/route.ts`
- Handle POST requests
- Store message as plain text (no encryption needed for public requests)
- Proper error handling and responses

### Step 2: Update Form Component
- Modify `components/RequestAccessForm.tsx`
- Change from direct Supabase call to API call
- Improve error handling and user feedback

### Step 3: Test the Fix
- Verify form submission works
- Test duplicate email handling
- Confirm message storage is working

## Technical Details

### API Route Structure
```typescript
export async function POST(request: Request) {
  // Parse request body
  // Validate email format
  // Store message as plain text (if provided)
  // Insert into database with correct column names
  // Handle errors gracefully
}
```

### Database Interaction
- Use `message_encrypted` column instead of `message`
- Handle UNIQUE constraint on email field
- Provide meaningful error messages

### Error Handling
- 409 Conflict: Email already exists
- 500 Server Error: Database failures
- 400 Bad Request: Invalid input data or email format