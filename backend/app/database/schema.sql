-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: buildings
CREATE TABLE IF NOT EXISTS public.buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: floors
CREATE TABLE IF NOT EXISTS public.floors (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    level INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: spaces
CREATE TABLE IF NOT EXISTS public.spaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    floor_id TEXT NOT NULL REFERENCES public.floors(id) ON DELETE CASCADE,
    capacity INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: seats
CREATE TABLE IF NOT EXISTS public.seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    space_id TEXT NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(space_id, label)
);

-- Table: reservations
CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    space_id TEXT NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'RESERVED',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    check_in_deadline TIMESTAMPTZ NOT NULL,
    qr_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent overlapping reservations for the same seat (if status is active)
    EXCLUDE USING gist (
        seat_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status IN ('RESERVED', 'CHECKED_IN'))
);

-- Table: occupancy_sessions
CREATE TABLE IF NOT EXISTS public.occupancy_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id TEXT NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE UNIQUE,
    seat_id UUID NOT NULL REFERENCES public.seats(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'OCCUPIED'
);

-- Table: seatsure_tasks
CREATE TABLE IF NOT EXISTS public.seatsure_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occupancy_session_id UUID NOT NULL REFERENCES public.occupancy_sessions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    deadline TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: admin_verification_tasks
CREATE TABLE IF NOT EXISTS public.admin_verification_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    occupancy_session_id UUID NOT NULL REFERENCES public.occupancy_sessions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    deadline TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS setup (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupancy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seatsure_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_verification_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Note: In this architecture, the backend uses a service role key to manage all data.
-- If the frontend queries Supabase directly, we would need explicit policies here.
-- For now, default deny-all is applied (except for postgres/service roles).
