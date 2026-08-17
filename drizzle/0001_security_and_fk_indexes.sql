-- Defense in depth: every business table is private by default. The web client
-- only receives the Supabase publishable key and cannot read app data directly.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'organizations',
    'customers',
    'specification_templates',
    'specification_template_fields',
    'organization_template_field_overrides',
    'orders',
    'order_drafts',
    'specification_versions',
    'order_files',
    'version_files',
    'portal_links',
    'approvals',
    'review_requests',
    'quote_items',
    'payments',
    'installations',
    'warranty_items',
    'service_requests',
    'activity_events',
    'notification_outbox'
  ]
  loop
    execute format('alter table app.%I enable row level security', table_name);
  end loop;
end
$$;

-- Keep extensions out of the API-facing public schema.
alter extension pg_trgm set schema extensions;

-- Cover composite and single-column foreign keys used by deletes and joins.
create index if not exists approvals_org_order_idx
  on app.approvals (organization_id, order_id);
create index if not exists approvals_portal_link_idx
  on app.approvals (portal_link_id);
create index if not exists approvals_org_version_idx
  on app.approvals (organization_id, version_id);
create index if not exists installations_org_order_idx
  on app.installations (organization_id, order_id);
create index if not exists notification_outbox_org_idx
  on app.notification_outbox (organization_id);
create index if not exists order_drafts_org_order_idx
  on app.order_drafts (organization_id, order_id);
create index if not exists orders_org_approved_version_idx
  on app.orders (organization_id, current_approved_version_id);
create index if not exists orders_org_customer_idx
  on app.orders (organization_id, customer_id);
create index if not exists orders_template_idx
  on app.orders (template_id);
create index if not exists template_field_overrides_field_idx
  on app.organization_template_field_overrides (field_id);
create index if not exists portal_links_org_order_idx
  on app.portal_links (organization_id, order_id);
create index if not exists review_requests_portal_link_idx
  on app.review_requests (portal_link_id);
create index if not exists review_requests_org_version_idx
  on app.review_requests (organization_id, version_id);
create index if not exists service_requests_warranty_item_idx
  on app.service_requests (warranty_item_id);
create index if not exists specification_templates_org_idx
  on app.specification_templates (organization_id);
create index if not exists version_files_org_file_idx
  on app.version_files (organization_id, file_id);
create index if not exists version_files_org_version_idx
  on app.version_files (organization_id, version_id);
