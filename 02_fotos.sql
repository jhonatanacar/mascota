-- Fase 2: espacio privado para fotos. Pegar en Supabase > SQL Editor > Run (una sola vez).
-- Cada usuario solo puede leer y escribir dentro de su carpeta: fotos/<su user id>/...

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg']);

create policy "fotos propias" on storage.objects for all to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = (select auth.uid())::text);
