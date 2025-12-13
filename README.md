# Proto

A minimal Next.js application with Supabase authentication, role-based access control, and property management with interactive maps.

## Features

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Supabase Auth (email + password)
- Role-based access control (RBAC) with "manager" and "staff" roles
- Properties management with geolocation
- Interactive Leaflet maps with OpenStreetMap
- iCal URL storage for calendar integration
- Protected routes with middleware
- Server and client-side authentication

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start development server on port 3000 |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm tsc --noEmit` | Type check without emitting |

## Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Full deployment guide for Vercel + Supabase
- **[supabase/migrations/](./supabase/migrations/)** — SQL migration files

---

## Getting Started (Detailed)

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
cp env.local.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run database migrations

Run the following SQL migrations in your Supabase SQL Editor (**SQL Editor** → **New query**):

| Migration | File | Description |
|-----------|------|-------------|
| 1 | `001_create_profiles.sql` | User profiles with roles |
| 2 | `002_create_properties.sql` | Properties table with RLS |
| 3 | `003_add_ical_url.sql` | iCal URL column |
| 4 | `004_create_bookings.sql` | Bookings table with RLS |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full SQL content.

### 5. Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Ensure **Email** provider is enabled
3. (Optional) Disable email confirmation for testing

### 6. Create a test user

Go to **Authentication** → **Users** → "Add user" → "Create new user"

### 7. Run the development server

```bash
pnpm dev
```

---

## Database Schema

### profiles

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references `auth.users(id)` |
| `role` | TEXT | User role: "manager" or "staff" |
| `created_at` | TIMESTAMPTZ | When the profile was created |

### properties

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `owner_id` | UUID | References `auth.users(id)`, the property owner |
| `name` | TEXT | Property name (required) |
| `address` | TEXT | Property address (optional) |
| `lat` | DOUBLE PRECISION | Latitude coordinate |
| `lng` | DOUBLE PRECISION | Longitude coordinate |
| `ical_url` | TEXT | iCal feed URL (optional) |
| `created_at` | TIMESTAMPTZ | When the property was created |

**Indexes:**
- `properties_owner_id_idx` — Fast lookup by owner
- `properties_location_idx` — Fast geospatial queries (lat, lng)
- `properties_created_at_idx` — Fast sorting by creation date

### bookings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `property_id` | UUID | References `properties(id)`, cascade delete |
| `source` | TEXT | Source of booking: "ical", "manual", etc. (default: "ical") |
| `external_uid` | TEXT | Unique ID from external calendar (e.g., iCal UID) |
| `start_date` | TIMESTAMPTZ | Booking start date/time |
| `end_date` | TIMESTAMPTZ | Booking end date/time |
| `summary` | TEXT | Booking title/summary (nullable) |
| `raw` | JSONB | Raw event data from source (nullable) |
| `created_at` | TIMESTAMPTZ | When the booking was created |
| `updated_at` | TIMESTAMPTZ | When the booking was last updated |

**Indexes:**
- `bookings_property_external_uid_idx` — Unique constraint for idempotent upserts
- `bookings_property_id_idx` — Fast lookup by property
- `bookings_date_range_idx` — Fast date range queries
- `bookings_start_date_idx` — Fast sorting by start date

**RLS Policies:** Users can only access bookings for properties they own.

---

## Project Structure

```
├── app/
│   ├── actions/              # Server actions
│   │   ├── properties.ts     # Property CRUD with logging
│   │   └── sync.ts           # Sync stub action
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   ├── Map.tsx           # Leaflet map component
│   │   ├── Navbar.tsx        # Navigation with auth state
│   │   ├── PropertyList.tsx  # Property cards with edit/delete
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx   # Client-side auth context
│   ├── dashboard/
│   │   └── page.tsx          # Manager dashboard
│   ├── login/
│   │   └── page.tsx          # Login form
│   ├── properties/
│   │   └── [id]/page.tsx     # Property detail page
│   └── staff/
│       └── page.tsx          # Staff portal
├── lib/
│   ├── logger.ts             # Structured logging utility
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       ├── middleware.ts     # Session & route protection
│       ├── roles.ts          # Server-side RBAC helpers
│       └── server.ts         # Server Supabase client
├── supabase/
│   └── migrations/           # SQL migration files
├── middleware.ts             # Next.js middleware entry
├── DEPLOYMENT.md             # Deployment guide
└── README.md
```

---

## Role-Based Access Control (RBAC)

### Roles

| Role | Dashboard | Staff Portal | Properties | Create/Edit |
|------|-----------|--------------|------------|-------------|
| **manager** | ✅ | ❌ | ✅ | ✅ |
| **staff** | ❌ | ✅ | ❌ | ❌ |

### Server-side usage

```typescript
import { getCurrentUserRole } from "@/lib/supabase/roles";

export default async function AdminPage() {
  const role = await getCurrentUserRole();
  
  if (role !== "manager") {
    redirect("/dashboard");
  }
  
  return <div>Admin content</div>;
}
```

### Client-side usage

```typescript
import { useAuth } from "@/app/contexts/AuthContext";

function MyComponent() {
  const { role } = useAuth();
  
  if (role === "manager") {
    return <ManagerView />;
  }
  
  return <StaffView />;
}
```

### Changing a user's role

```sql
UPDATE public.profiles 
SET role = 'staff' 
WHERE id = 'user-uuid-here';
```

---

## Feature Checklist

| Feature | Status |
|---------|--------|
| ✅ User can login/logout | Complete |
| ✅ Create property on map | Complete |
| ✅ View/edit property | Complete |
| ✅ Store iCal URL | Complete |
| ✅ RBAC enforced | Complete |
| ⏳ Sync bookings | Stub only |
| ⏳ Health score | Coming soon |
| ⏳ Package selection | Coming soon |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |

Both variables are prefixed with `NEXT_PUBLIC_` to make them available in the browser.

---

## Security Notes

- Session tokens are stored in HTTP-only cookies (handled by `@supabase/ssr`)
- The `anon` key is safe to expose publicly—Row Level Security (RLS) protects data
- Always validate user permissions server-side before sensitive operations
- Role checks should always be done server-side for security-critical operations
- Properties are protected by RLS: users can only access their own properties
- All API errors are logged with structured context

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete instructions on:

- Deploying to Vercel
- Configuring Supabase for production
- Environment variables
- Production checklist
- Feature verification checklist
