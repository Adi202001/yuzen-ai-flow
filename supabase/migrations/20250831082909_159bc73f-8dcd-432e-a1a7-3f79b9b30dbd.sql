-- Drop the problematic constraint first
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'hr', 'employee');

-- Update profiles table to use the new enum
ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;

-- Set new default
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'employee'::user_role;