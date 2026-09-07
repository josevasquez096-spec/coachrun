-- Ejecutar en Supabase > SQL Editor
create type user_role as enum ('coach', 'athlete');
create type workout_type as enum ('easy', 'long', 'tempo', 'intervals', 'race', 'rest', 'strength');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role user_role not null default 'athlete',
  coach_id uuid references profiles(id),
  strava_athlete_id bigint unique,
  strava_access_token text,
  strava_refresh_token text,
  strava_expires_at bigint,
  created_at timestamptz default now()
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id),
  athlete_id uuid not null references profiles(id),
  date date not null,
  type workout_type not null default 'easy',
  title text not null,
  description text,
  target_distance_km numeric,
  target_duration_min int,
  target_pace text,           -- ej. "5:10-5:30"
  completed boolean default false,
  created_at timestamptz default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references profiles(id),
  workout_id uuid references workouts(id),
  source text not null,       -- 'app' | 'strava'
  strava_id bigint unique,
  name text,
  started_at timestamptz not null,
  distance_m numeric,
  moving_time_s int,
  avg_hr numeric,
  polyline text,
  raw jsonb,
  created_at timestamptz default now()
);

-- Trigger: crea profile al registrarse
create function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table workouts enable row level security;
alter table activities enable row level security;

create policy "propio perfil" on profiles for select using (auth.uid() = id);
create policy "editar propio perfil" on profiles for update using (auth.uid() = id);
create policy "coach ve alumnos" on profiles for select using (coach_id = auth.uid());

create policy "atleta ve sus entrenos" on workouts for select using (athlete_id = auth.uid());
create policy "atleta marca completado" on workouts for update using (athlete_id = auth.uid());
create policy "coach gestiona entrenos" on workouts for all using (coach_id = auth.uid());

create policy "atleta ve actividades" on activities for select using (athlete_id = auth.uid());
create policy "atleta crea actividades" on activities for insert with check (athlete_id = auth.uid());
create policy "coach ve actividades de alumnos" on activities for select
  using (exists (select 1 from profiles p where p.id = activities.athlete_id and p.coach_id = auth.uid()));

-- Para vincular alumno a coach: el coach comparte su id y el alumno lo pega al registrarse,
-- o el coach lo asigna desde el panel (usa service role en /api/coach/link).
