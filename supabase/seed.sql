-- Supabase Seed File
-- This file runs after migrations during db reset
-- Creates a test user for development

-- Create the user with auto-confirm
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'tadeva1577@mvpmedix.com',
  crypt('c627zJ8A739y24B3K^x*', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Verify the user was created
SELECT 
  'User created successfully' as status,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'tadeva1577@mvpmedix.com';
