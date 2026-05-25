insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "household can upload attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'attachments');

create policy "household can read attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'attachments');

create policy "owners can delete attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'attachments' and owner = auth.uid());
