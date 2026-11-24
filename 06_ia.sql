-- Fase 9: IA. Pegar en Supabase > SQL Editor > Run (una sola vez).

-- registro de consultas a la IA, para el límite diario
create table if not exists public.ia_llamadas (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz not null default now(),
  usuario text,
  modo text
);
alter table public.ia_llamadas enable row level security;
-- solo leer y agregar: nadie puede borrar registros para "reiniciar" el límite diario
drop policy if exists compartido on public.ia_llamadas;
drop policy if exists leer on public.ia_llamadas;
drop policy if exists agregar on public.ia_llamadas;
create policy leer on public.ia_llamadas for select to authenticated using (true);
create policy agregar on public.ia_llamadas for insert to authenticated with check (true);
revoke update, delete on public.ia_llamadas from authenticated;
grant select, insert on public.ia_llamadas to authenticated;

-- datos extra de lo que propone la IA (por ejemplo, una regla para crear al confirmar)
alter table public.aprendizajes add column if not exists datos jsonb;
