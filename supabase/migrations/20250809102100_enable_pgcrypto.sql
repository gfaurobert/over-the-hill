-- Enable pgcrypto extension for encryption functions
-- Migration: 20250809102100_enable_pgcrypto.sql

-- Enable the pgcrypto extension if it's not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
