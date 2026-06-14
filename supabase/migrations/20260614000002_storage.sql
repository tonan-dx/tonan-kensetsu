-- 写真用ストレージバケット
insert into storage.buckets (id, name, public)
values ('construction-photos', 'construction-photos', true)
on conflict (id) do nothing;

-- 全員アップロード・閲覧可能 (認証後に要調整)
create policy "public read" on storage.objects
  for select using (bucket_id = 'construction-photos');

create policy "public upload" on storage.objects
  for insert with check (bucket_id = 'construction-photos');

create policy "public delete" on storage.objects
  for delete using (bucket_id = 'construction-photos');
