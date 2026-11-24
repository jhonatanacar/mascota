-- Compartir: cualquier usuario con sesión iniciada ve y edita todo (mascotas, historial, fotos...).
-- Quién puede iniciar sesión se controla desactivando el registro de usuarios nuevos en Supabase (ver GUIA.md).
-- Además guarda quién hizo cada registro del historial.
-- Pegar en Supabase > SQL Editor > Run (una sola vez; se puede repetir sin problema).

do $$
declare t text;
begin
  foreach t in array array['mascotas', 'contactos', 'eventos', 'plan_alimentacion', 'reglas', 'recomendaciones',
                           'salud', 'medicamentos', 'peso', 'aprendizajes'] loop
    execute format('drop policy if exists propias on public.%I', t);
    execute format('drop policy if exists hogar on public.%I', t);
    execute format('drop policy if exists compartido on public.%I', t);
    execute format('create policy compartido on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- limpia la versión anterior con lista de emails, si se llegó a correr
drop function if exists public.permitido();
drop table if exists public.permitidos;

drop policy if exists "fotos propias" on storage.objects;
drop policy if exists "fotos hogar" on storage.objects;
drop policy if exists "fotos compartidas" on storage.objects;
create policy "fotos compartidas" on storage.objects for all to authenticated
  using (bucket_id = 'fotos') with check (bucket_id = 'fotos');

-- quién registró cada evento (se completa solo con el email de quien inició sesión)
alter table public.eventos add column if not exists creado_por text default (auth.jwt() ->> 'email');
