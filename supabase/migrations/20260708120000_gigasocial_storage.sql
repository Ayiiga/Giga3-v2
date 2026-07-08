-- GigaSocial dedicated storage buckets (additive migration)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'social-images',
    'social-images',
    true,
    15728640,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'social-videos',
    'social-videos',
    true,
    104857600,
    array['video/mp4', 'video/webm', 'video/quicktime']
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users can read public media" on storage.objects;
create policy "authenticated users can read public media"
on storage.objects for select
using (
  bucket_id in ('images', 'videos', 'avatars', 'social-images', 'social-videos')
  or auth.role() = 'authenticated'
);

drop policy if exists "authenticated users can upload own files" on storage.objects;
create policy "authenticated users can upload own files"
on storage.objects for insert
with check (
  auth.role() = 'authenticated'
  and bucket_id in ('images', 'videos', 'avatars', 'uploads', 'social-images', 'social-videos')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated users can update own files" on storage.objects;
create policy "authenticated users can update own files"
on storage.objects for update
using (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text)
with check (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "authenticated users can delete own files" on storage.objects;
create policy "authenticated users can delete own files"
on storage.objects for delete
using (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text);
