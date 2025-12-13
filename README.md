# Proto

A minimal Next.js application with Supabase authentication.

## Features

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Supabase Auth (email + password)
- Protected routes with middleware
- Server and client-side authentication

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API**
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Ensure **Email** provider is enabled
3. (Optional) Disable email confirmation for testing:
   - Go to **Authentication** → **Providers** → **Email**
   - Toggle off "Confirm email"

### 5. Create a test user

Option A: Via Supabase Dashboard
1. Go to **Authentication** → **Users**
2. Click "Add user" → "Create new user"
3. Enter email and password (min 6 characters)

Option B: Add a signup form to your app (not included by default)

### 6. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── components/
│   │   └── Navbar.tsx           # Navigation with auth state
│   ├── contexts/
│   │   └── AuthContext.tsx      # Client-side auth context
│   ├── dashboard/
│   │   └── page.tsx             # Protected dashboard (server component)
│   ├── login/
│   │   └── page.tsx             # Login form
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── supabase/
│       ├── client.ts            # Browser Supabase client
│       ├── middleware.ts        # Session refresh & route protection
│       └── server.ts            # Server Supabase client
├── middleware.ts                # Next.js middleware entry
└── .env.local.example
```

## Authentication Flow

1. **Middleware** (`middleware.ts`) runs on every request:
   - Refreshes the session if expired
   - Redirects unauthenticated users from `/dashboard` to `/login`
   - Redirects authenticated users from `/login` to `/dashboard`

2. **Server Components** use `lib/supabase/server.ts` to get the current user

3. **Client Components** use the `AuthContext` for reactive auth state

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

Both variables are prefixed with `NEXT_PUBLIC_` to make them available in the browser.

## Security Notes

- Session tokens are stored in HTTP-only cookies (handled by `@supabase/ssr`)
- The `anon` key is safe to expose publicly—Row Level Security (RLS) should protect your data
- Always validate user permissions server-side before sensitive operations
