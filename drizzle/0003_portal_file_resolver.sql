create or replace function public.resolve_portal_file(
  p_token_hash text,
  p_file_id uuid
)
returns table (
  storage_bucket text,
  storage_path text,
  original_name text,
  mime_type text
)
language sql
stable
security definer
set search_path = ''
as $$
  select file.storage_bucket, file.storage_path, file.original_name, file.mime_type
  from app.portal_links link
  inner join app.version_files manifest
    on manifest.organization_id = link.organization_id
   and manifest.version_id = link.version_id
  inner join app.order_files file
    on file.organization_id = manifest.organization_id
   and file.id = manifest.file_id
  where link.token_hash = p_token_hash
    and file.id = p_file_id
    and link.revoked_at is null
    and (link.expires_at is null or link.expires_at > now())
  limit 1;
$$;

revoke all on function public.resolve_portal_file(text, uuid) from public;
grant execute on function public.resolve_portal_file(text, uuid) to anon, authenticated, service_role;
