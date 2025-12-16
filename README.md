# Proto

A minimal Next.js application with Supabase authentication, role-based access control, and property management with interactive maps.

## Features

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Supabase Auth (email + password)
- Role-based access control (RBAC) with "admin", "manager", and "staff" roles
- Organization-based multi-tenancy
- Properties management with geolocation
- Interactive Leaflet maps with OpenStreetMap
- iCal URL storage for calendar integration
- Task management with status tracking
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
| 5 | `005_create_tasks.sql` | Tasks and task_events tables |
| 6 | `006_manager_view_staff.sql` | Manager staff visibility |
| 7 | `007_add_health_score.sql` | Property health scoring |
| 8 | `008_fix_profiles_rls.sql` | Fix RLS recursion |
| 9 | `009_add_sync_status.sql` | Sync status tracking |
| 10 | `010_add_admin_and_orgs.sql` | **Admin role + Organizations** |
| 11 | `011_update_rls_for_orgs.sql` | **Org-scoped RLS policies** |

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

## Creating the First Admin

New users automatically get the "manager" role. To create an admin, follow these steps:

### Option 1: Manual SQL (Recommended for first admin)

1. First, create a user via Supabase Auth:
   - Go to **Authentication** → **Users** → "Add user"
   - Create the user with email/password

2. Then run this SQL in the Supabase SQL Editor:

```sql
-- Replace 'your-admin-email@example.com' with the actual email
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

Or, if you know the user's UUID:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'user-uuid-here';
```

### Option 2: Seed Script

Create a one-time seed by running this SQL after migrations:

```sql
-- Create admin profile for first admin user
-- Run AFTER the user has signed up at least once

-- Find your user ID first:
SELECT id, email FROM auth.users WHERE email = 'your-admin@example.com';

-- Then update their role:
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin@example.com';
```

### Security Note

- There is no UI to create admins from scratch (by design)
- Admins cannot demote other admins
- Admins cannot disable other admin accounts
- New signups always default to "manager" role

---

## Organization (Org) Assignment

The app uses organizations for multi-tenant access control. Here's how it works:

### How Organizations Work

1. **Default Organization**: Migration 010 creates a "Default Organization" and assigns all existing users/properties to it.

2. **Automatic Assignment**: New users are automatically assigned to the "Default Organization" on signup.

3. **Visibility Rules**:
   - **Admin**: Can see all organizations, all users, all properties
   - **Manager**: Can only see properties they own; can assign tasks to staff in their org
   - **Staff**: Can view all properties in their org on the map; can only update tasks assigned to them

### Assigning Users to Organizations

Admins can change user organizations via `/admin/users` or via SQL:

```sql
-- Move a user to a different organization
UPDATE public.profiles
SET org_id = 'target-org-uuid'
WHERE id = 'user-uuid';

-- Create a new organization
INSERT INTO public.organizations (name)
VALUES ('Acme Property Management');

-- List all organizations
SELECT id, name, created_at FROM public.organizations;
```

### Creating Additional Organizations (Admin only)

Currently managed via SQL. A UI will be added in Week 3:

```sql
INSERT INTO public.organizations (name)
VALUES ('New Organization Name')
RETURNING id, name;
```

---

## Database Schema

### profiles

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, references `auth.users(id)` |
| `role` | TEXT | User role: "admin", "manager", or "staff" |
| `email` | TEXT | User's email (synced from auth) |
| `org_id` | UUID | References `organizations(id)` |
| `disabled` | BOOLEAN | Soft-disable flag (default: false) |
| `created_at` | TIMESTAMPTZ | When the profile was created |

### organizations

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `name` | TEXT | Organization name |
| `created_at` | TIMESTAMPTZ | When the org was created |

### properties

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `owner_id` | UUID | References `auth.users(id)`, the property owner |
| `org_id` | UUID | References `organizations(id)` |
| `name` | TEXT | Property name (required) |
| `address` | TEXT | Property address (optional) |
| `lat` | DOUBLE PRECISION | Latitude coordinate |
| `lng` | DOUBLE PRECISION | Longitude coordinate |
| `ical_url` | TEXT | iCal feed URL (optional) |
| `health_score` | INTEGER | Health score 0-100 (default: 100) |
| `last_sync_at` | TIMESTAMPTZ | Last calendar sync time |
| `last_sync_status` | TEXT | Sync status: "success", "error", "pending" |
| `created_at` | TIMESTAMPTZ | When the property was created |

### bookings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `property_id` | UUID | References `properties(id)`, cascade delete |
| `source` | TEXT | Source of booking: "ical", "manual", etc. |
| `external_uid` | TEXT | Unique ID from external calendar |
| `start_date` | TIMESTAMPTZ | Booking start date/time |
| `end_date` | TIMESTAMPTZ | Booking end date/time |
| `summary` | TEXT | Booking title/summary |
| `raw` | JSONB | Raw event data from source |
| `created_at` | TIMESTAMPTZ | When the booking was created |
| `updated_at` | TIMESTAMPTZ | When the booking was last updated |

### tasks

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `property_id` | UUID | References `properties(id)`, cascade delete |
| `type` | TEXT | Task type: "cleaning", "restock", "maintenance" |
| `due_at` | TIMESTAMPTZ | When the task is due |
| `status` | TEXT | Status: "open", "assigned", "in_progress", "done", "verified" |
| `assigned_to` | UUID | References `auth.users(id)`, nullable |
| `created_from_booking_id` | UUID | References `bookings(id)`, nullable |
| `created_at` | TIMESTAMPTZ | When the task was created |
| `updated_at` | TIMESTAMPTZ | When the task was last updated |

### task_events

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `task_id` | UUID | References `tasks(id)`, cascade delete |
| `actor_id` | UUID | User who made the change |
| `from_status` | TEXT | Previous status (nullable for creation) |
| `to_status` | TEXT | New status |
| `note` | TEXT | Optional note/comment |
| `created_at` | TIMESTAMPTZ | When the event occurred |

---

## Project Structure

```
├── app/
│   ├── actions/              # Server actions
│   │   ├── admin.ts          # Admin user management
│   │   ├── bookings.ts       # Booking CRUD
│   │   ├── properties.ts     # Property CRUD with logging
│   │   ├── sync.ts           # iCal sync action
│   │   └── tasks.ts          # Task & task event CRUD
│   ├── admin/                # Admin-only pages
│   │   ├── layout.tsx        # Admin layout with nav
│   │   ├── page.tsx          # Admin dashboard
│   │   └── users/            # User management
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
│       ├── page.tsx          # Staff portal
│       ├── map/              # Staff property map view
│       └── tasks/            # Staff task management
├── lib/
│   ├── logger.ts             # Structured logging utility
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       ├── middleware.ts     # Session & route protection
│       ├── profiles.ts       # Client-side profile helpers
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

| Role | Admin Panel | Dashboard | Staff Portal | Properties | Tasks | User Management |
|------|-------------|-----------|--------------|------------|-------|-----------------|
| **admin** | ✅ | ✅ | ✅ | Full CRUD (all) | Full CRUD (all) | ✅ |
| **manager** | ❌ | ✅ | ❌ | Full CRUD (own) | Full CRUD (own properties) | ❌ |
| **staff** | ❌ | ❌ | ✅ | Read (org) | Read assigned, update status | ❌ |

### Server-side RBAC Helpers

```typescript
import { 
  getCurrentUser,
  requireRole, 
  requireAdmin,
  requireManagerOrAdmin 
} from "@/lib/supabase/roles";

// Get current user with profile
const user = await getCurrentUser();

// Require specific role(s) - throws/redirects if unauthorized
await requireRole("admin");
await requireRole(["admin", "manager"]);
await requireAdmin("/login");  // Redirect to login if not admin
await requireManagerOrAdmin();
```

### Client-side usage

```typescript
import { useAuth } from "@/app/contexts/AuthContext";

function MyComponent() {
  const { role } = useAuth();
  
  if (role === "admin") {
    return <AdminView />;
  } else if (role === "manager") {
    return <ManagerView />;
  }
  
  return <StaffView />;
}
```

### Changing a user's role (Admin only)

Via Admin UI: `/admin/users`

Or via SQL:

```sql
UPDATE public.profiles 
SET role = 'staff' 
WHERE id = 'user-uuid-here';
```

### Disabling a user account (Admin only)

Via Admin UI: `/admin/users` → Click "Disable"

Or via SQL:

```sql
UPDATE public.profiles 
SET disabled = true 
WHERE id = 'user-uuid-here';
```

---

## Staff Access to Properties

Staff members can now view properties on a map:

1. Navigate to `/staff/map` (or click "Property Map" from Staff Portal)
2. All properties in the staff member's organization are visible
3. Click a property pin to see details
4. Staff view is read-only - no editing capabilities

Staff task restrictions:
- Can only see tasks assigned to them
- Can only update task status (not other fields)
- Valid status transitions: `open/assigned` → `in_progress` → `done`
- Cannot mark tasks as `verified` (manager/admin only)

---

## Feature Checklist

| Feature | Status |
|---------|--------|
| ✅ User can login/logout | Complete |
| ✅ Create property on map | Complete |
| ✅ View/edit property | Complete |
| ✅ Store iCal URL | Complete |
| ✅ Sync bookings from iCal | Complete |
| ✅ Task management | Complete |
| ✅ Task assignment to staff | Complete |
| ✅ Staff task status updates | Complete |
| ✅ RBAC enforced (3 roles) | Complete |
| ✅ Admin user management | Complete |
| ✅ Organization support | Complete |
| ✅ Staff map view | Complete |
| ✅ Health score | Complete |
| ⏳ Warehouse catalog | Week 3 |
| ⏳ Package selection | Week 3 |

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
- All role checks are enforced server-side via RBAC helpers
- Properties are protected by RLS with org-scoped access
- Staff can only update tasks assigned to them with validated status transitions
- Disabled users are blocked at login and middleware level
- All API errors are logged with structured context
- Task events create an audit trail of all status changes

---

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete instructions on:

- Deploying to Vercel
- Configuring Supabase for production
- Environment variables
- Production checklist
- Feature verification checklist
