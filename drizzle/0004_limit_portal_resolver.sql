revoke execute on function public.resolve_portal_file(text, uuid) from anon, authenticated;
grant execute on function public.resolve_portal_file(text, uuid) to service_role;
