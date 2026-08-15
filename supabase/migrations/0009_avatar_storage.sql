-- KnowRa — bucket de avatares (upload de foto de perfil)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- leitura pública (avatar precisa aparecer pra qualquer um ver, é uma imagem de perfil)
create policy "avatar publico legivel"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- cada usuário só escreve/atualiza/apaga dentro da própria pasta ({user_id}/...)
create policy "usuario sobe o proprio avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "usuario atualiza o proprio avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "usuario remove o proprio avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
