# Deployment Guide

This guide covers deploying the Proto application on **Vercel** with **Supabase** as the backend.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Supabase Setup](#supabase-setup)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [Production Checklist](#production-checklist)
- [Feature Verification Checklist](#feature-verification-checklist)

---

## Prerequisites

- Node.js 18+ installed
- pnpm (or npm/yarn)
- Git repository (GitHub, GitLab, or Bitbucket)
- [Supabase](https://supabase.com) account
- [Vercel](https://vercel.com) account

---

## Local Development

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd proto3
pnpm install
```

### 2. Set Up Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Database Migrations

Go to your Supabase project's SQL Editor and run these migrations in order:

```bash
# Migration files are in: supabase/migrations/
# Run in order:
# 1. 001_create_profiles.sql
# 2. 002_create_properties.sql
# 3. 003_add_ical_url.sql
```

### 4. Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### 5. Create a Test User

1. Go to `http://localhost:3000/login`
2. Use Supabase Dashboard → Authentication → Users → "Add User"
3. Or enable email signup in Supabase Auth settings

---

## Supabase Setup

### 1. Create a New Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details and wait for setup

### 2. Get API Credentials

1. Go to Settings → API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Run Database Migrations

Go to SQL Editor and run each migration file:

#### Migration 1: Profiles Table

```sql
-- supabase/migrations/001_create_profiles.sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
```

#### Migration 2: Properties Table

```sql
-- supabase/migrations/002_create_properties.sql
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS properties_location_idx ON public.properties(lat, lng);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own properties"
  ON public.properties FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own properties"
  ON public.properties FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own properties"
  ON public.properties FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own properties"
  ON public.properties FOR DELETE USING (auth.uid() = owner_id);

GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
```

#### Migration 3: iCal URL Column

```sql
-- supabase/migrations/003_add_ical_url.sql
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS ical_url TEXT;
```

### 4. Configure Authentication

1. Go to Authentication → Providers
2. Enable **Email** provider
3. Configure email templates (optional)
4. Set Site URL to your production domain

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Select the repository

### 2. Configure Build Settings

Vercel should auto-detect Next.js. Verify:

- **Framework Preset**: Next.js
- **Build Command**: `pnpm build` (or `next build`)
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

### 3. Add Environment Variables

In Vercel project settings → Environment Variables, add:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your-anon-public-key` | All |

### 4. Deploy

Click "Deploy" and wait for the build to complete.

### 5. Update Supabase Settings

After deployment, update Supabase:

1. Go to Authentication → URL Configuration
2. Set **Site URL** to your Vercel domain (e.g., `https://your-app.vercel.app`)
3. Add redirect URLs if needed

---

## Environment Variables

### Required Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase → Settings → API |

### Optional Variables (Future)

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | For server-side admin operations |

---

## Production Checklist

### Security

- [ ] Row Level Security (RLS) enabled on all tables
- [ ] Anon key is public-safe (only for client operations)
- [ ] Service role key is NOT exposed to client
- [ ] Authentication required for protected routes
- [ ] RBAC enforced (manager vs staff)

### Database

- [ ] All migrations applied
- [ ] Indexes created for performance
- [ ] RLS policies tested

### Supabase

- [ ] Site URL configured correctly
- [ ] Email templates customized (optional)
- [ ] Rate limiting configured (optional)

### Vercel

- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)

### Application

- [ ] Login/logout working
- [ ] Protected routes redirect properly
- [ ] Error handling in place
- [ ] Loading states displayed

---

## Feature Verification Checklist

After deployment, verify each feature works:

### ✅ Authentication

- [ ] **Login**: User can sign in with email/password
- [ ] **Logout**: User can sign out, session cleared
- [ ] **Protected Routes**: Unauthenticated users redirected to `/login`
- [ ] **Session Persistence**: User stays logged in on refresh

### ✅ Property Management

- [ ] **Create Property on Map**: Click "Claim Property", click map, fill form, save
- [ ] **View Properties**: Properties displayed on map and in list
- [ ] **Edit Property**: Update name/address from list or side panel
- [ ] **Delete Property**: Remove property with confirmation

### ✅ Property Details

- [ ] **Property Page**: `/properties/[id]` shows full details
- [ ] **Store iCal URL**: Enter and save iCal URL with validation (.ics required)
- [ ] **Sync Button**: "Sync Bookings" button shows stub message

### ✅ Role-Based Access Control (RBAC)

- [ ] **Manager Role**:
  - Can access `/dashboard`
  - Can create/edit/delete properties
  - Can access `/properties/[id]`
  - Cannot access `/staff`
- [ ] **Staff Role**:
  - Can access `/staff`
  - Cannot access `/dashboard`
  - Cannot create/edit/delete properties
  - Cannot access `/properties/[id]`

---

## Quick Commands Reference

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server locally
pnpm start

# Run linter
pnpm lint

# Type check
pnpm tsc --noEmit
```

---

## Troubleshooting

### "Invalid API key" Error

- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check for trailing slashes or spaces

### "Table not found" Error

- Ensure all SQL migrations have been run
- Check table names match exactly (case-sensitive)

### Login Redirects to Login

- Clear browser cookies
- Check Supabase Site URL matches your domain
- Verify authentication is working in Supabase Dashboard

### CORS Errors

- Add your domain to Supabase → Settings → API → Additional Redirect URLs

---

## Support

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

