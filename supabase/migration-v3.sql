-- === Zonas de frecuencia cardíaca ===
alter table profiles add column if not exists max_hr int;
alter table profiles add column if not exists resting_hr int;

-- === Esfuerzo percibido y notas de la actividad ===
alter table activities add column if not exists rpe int;
alter table activities add column if not exists notes text;

-- === Chat entrenador / atleta ===
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists messages_hilo on messages (coach_id, athlete_id, created_at desc);

alter table messages enable row level security;
drop policy if exists "ver mis mensajes" on messages;
create policy "ver mis mensajes" on messages for select
  using (auth.uid() = coach_id or auth.uid() = athlete_id);
drop policy if exists "enviar mis mensajes" on messages;
create policy "enviar mis mensajes" on messages for insert
  with check (auth.uid() = sender_id and (auth.uid() = coach_id or auth.uid() = athlete_id));
drop policy if exists "marcar leidos" on messages;
create policy "marcar leidos" on messages for update
  using (auth.uid() = coach_id or auth.uid() = athlete_id);
