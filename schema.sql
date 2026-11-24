-- Esquema completo de Mascota. Pegar entero en Supabase > SQL Editor > Run.
-- Proyecto nuevo: correr en orden schema.sql, 02_fotos.sql, 03_permisos.sql, 04_compartir.sql, 05_comida.sql, 06_ia.sql.
-- Seguridad: RLS en todas las tablas. Aquí cada usuario ve lo suyo; 04_compartir.sql lo cambia a "todos los usuarios con sesión comparten todo".

create table public.mascotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  especie text,
  raza text,
  fecha_nacimiento date,
  sexo text check (sexo in ('macho', 'hembra')),
  esterilizado boolean,
  foto_url text,
  notas text,
  creado timestamptz not null default now()
);

-- true si la mascota es del usuario logueado; lo usan las políticas de las tablas hijas
create function public.es_mia(mid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mascotas where id = mid and user_id = auth.uid())
$$;

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  tipo text not null check (tipo in ('paseo', 'comida', 'salida', 'medicina', 'bano', 'sintoma', 'conducta', 'otro')),
  fecha_hora timestamptz not null default now(),
  duracion_min int check (duracion_min >= 0),
  cantidad text,
  nota text
);

create table public.plan_alimentacion (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  alimento text not null,
  gramos numeric check (gramos > 0),
  hora time,
  activo boolean not null default true
);

create table public.reglas (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  tipo text not null check (tipo in ('alergia', 'evitar', 'preferencia', 'indicacion_vet')),
  sustancia text not null,
  sinonimos text[] not null default '{}',
  gravedad text check (gravedad in ('leve', 'moderada', 'grave')),
  origen text not null default 'yo' check (origen in ('yo', 'ia', 'veterinario')),
  activa boolean not null default true,
  creada timestamptz not null default now(),
  unique (id, mascota_id)
);

create table public.recomendaciones (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  fecha timestamptz not null default now(),
  texto text not null,
  ingredientes text[] not null default '{}',
  estado text not null default 'propuesta' check (estado in ('propuesta', 'aceptada', 'rechazada', 'bloqueada')),
  motivo_bloqueo text,
  regla_id uuid,
  -- la regla debe ser de la misma mascota
  foreign key (regla_id, mascota_id) references public.reglas (id, mascota_id) on delete set null (regla_id)
);

create table public.salud (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  tipo text not null check (tipo in ('vacuna', 'desparasitacion', 'consulta', 'cirugia', 'analisis')),
  fecha date not null,
  proxima_fecha date,
  detalle text,
  veterinario text
);

create table public.medicamentos (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  nombre text not null,
  dosis text,
  cada_horas numeric check (cada_horas > 0),
  desde date,
  hasta date
);

create table public.peso (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  fecha date not null default current_date,
  kg numeric not null check (kg > 0)
);

create table public.aprendizajes (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  fecha timestamptz not null default now(),
  origen text not null check (origen in ('regla', 'ia')),
  texto text not null,
  confirmado boolean not null default false
);

create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nombre text not null,
  tipo text check (tipo in ('veterinario', 'paseador', 'emergencia')),
  telefono text
);

-- RLS
alter table public.mascotas enable row level security;
alter table public.contactos enable row level security;
create policy propias on public.mascotas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy propias on public.contactos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['eventos', 'plan_alimentacion', 'reglas', 'recomendaciones',
                           'salud', 'medicamentos', 'peso', 'aprendizajes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy propias on public.%I for all to authenticated
                    using (public.es_mia(mascota_id)) with check (public.es_mia(mascota_id))', t);
    execute format('create index on public.%I (mascota_id)', t);
  end loop;
end $$;
