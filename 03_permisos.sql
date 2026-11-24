-- Corrige "permission denied for table ...": los proyectos nuevos de Supabase no dan acceso
-- automático a las tablas creadas por SQL. Solo usuarios logueados; RLS sigue filtrando por dueño.
-- Pegar en Supabase > SQL Editor > Run (una sola vez).

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.es_mia(uuid) to authenticated;
