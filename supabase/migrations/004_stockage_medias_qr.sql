-- DOSSIER 047 : stockage permanent des médias associés aux QR codes.
-- Les politiques de lecture publique et d’écriture administrateur sont définies dans la migration 001.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dossier047-media',
  'dossier047-media',
  true,
  52428800,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm',
    'video/mp4','video/webm','video/quicktime',
    'application/pdf'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Règles de sécurité : lecture publique, écriture réservée aux comptes admin.
drop policy if exists "D047 public read media" on storage.objects;
create policy "D047 public read media" on storage.objects
for select to public
using (bucket_id = 'dossier047-media');

drop policy if exists "D047 admin upload media" on storage.objects;
create policy "D047 admin upload media" on storage.objects
for insert to authenticated
with check (bucket_id = 'dossier047-media' and public.is_d047_admin());

drop policy if exists "D047 admin update media" on storage.objects;
create policy "D047 admin update media" on storage.objects
for update to authenticated
using (bucket_id = 'dossier047-media' and public.is_d047_admin())
with check (bucket_id = 'dossier047-media' and public.is_d047_admin());

drop policy if exists "D047 admin delete media" on storage.objects;
create policy "D047 admin delete media" on storage.objects
for delete to authenticated
using (bucket_id = 'dossier047-media' and public.is_d047_admin());
