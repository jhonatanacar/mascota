-- Recordatorios en el celular (Web Push). Pegar en Supabase > SQL Editor > Run (una sola vez).
-- ANTES de correrlo, reemplaza PEGA_AQUI_EL_CRON_SECRET (abajo) por el mismo valor del secreto
-- CRON_SECRET de la función "recordatorios". No guardes ese valor en este archivo: el repo es público.

-- dispositivos que aceptaron recibir avisos
create table if not exists public.push_suscripciones (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  usuario text default (auth.jwt() ->> 'email'),
  creado timestamptz not null default now()
);
alter table public.push_suscripciones enable row level security;
drop policy if exists compartido on public.push_suscripciones;
create policy compartido on public.push_suscripciones for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.push_suscripciones to authenticated;

-- avisos ya enviados, para no repetirlos (solo la función, con la clave de servicio, la usa)
create table if not exists public.push_enviados (
  clave text primary key,
  enviado timestamptz not null default now()
);
alter table public.push_enviados enable row level security; -- sin políticas: la app no la ve

-- tarea automática cada 15 minutos que llama a la función "recordatorios"
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('recordatorios') where exists (select 1 from cron.job where jobname = 'recordatorios');
select cron.schedule('recordatorios', '*/15 * * * *', $$
  select net.http_post(
    url := 'https://bdxoljwhbfmsxwisbkys.supabase.co/functions/v1/recordatorios',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "PEGA_AQUI_EL_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  delete from public.push_enviados where enviado < now() - interval '30 days';
$$);
