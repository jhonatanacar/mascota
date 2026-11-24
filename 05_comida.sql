-- Fase 11: comida, inventario, gastos y raza. Pegar en Supabase > SQL Editor > Run (una sola vez).

-- datos para calcular calorías
alter table public.mascotas
  add column if not exists actividad text not null default 'normal' check (actividad in ('baja', 'normal', 'alta')),
  add column if not exists objetivo text not null default 'mantener' check (objetivo in ('mantener', 'bajar')),
  add column if not exists peso_objetivo numeric check (peso_objetivo > 0);

-- nuevos tipos: premio (registro) y peluquería / dental (salud)
alter table public.eventos drop constraint if exists eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check
  check (tipo in ('paseo', 'comida', 'premio', 'salida', 'medicina', 'bano', 'sintoma', 'conducta', 'otro'));
alter table public.salud drop constraint if exists salud_tipo_check;
alter table public.salud add constraint salud_tipo_check
  check (tipo in ('vacuna', 'desparasitacion', 'consulta', 'cirugia', 'analisis', 'peluqueria', 'dental'));

-- qué ingredientes tolera cada perro (⛔ además crea una regla de alergia desde la app)
create table if not exists public.ingredientes_mascota (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid not null references public.mascotas on delete cascade,
  ingrediente text not null,
  estado text not null check (estado in ('tolera', 'probando', 'alergico')),
  desde date not null default current_date,
  unique (mascota_id, ingrediente)
);

-- bolsas / alimentos en casa (mascota_id vacío = compartido entre todos)
create table if not exists public.inventario (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid references public.mascotas on delete cascade,
  alimento text not null,
  kg numeric not null check (kg > 0),
  abierto date not null default current_date,
  gramos_dia numeric check (gramos_dia > 0),
  activo boolean not null default true
);

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  mascota_id uuid references public.mascotas on delete set null,
  fecha date not null default current_date,
  categoria text not null check (categoria in ('veterinario', 'comida', 'peluqueria', 'medicinas', 'accesorios', 'otros')),
  monto numeric not null check (monto >= 0),
  nota text
);

do $$
declare t text;
begin
  foreach t in array array['ingredientes_mascota', 'inventario', 'gastos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists compartido on public.%I', t);
    execute format('create policy compartido on public.%I for all to authenticated using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
