alter table public.channels
  add column provider_identity_id text;

create unique index channels_business_platform_provider_identity_idx
  on public.channels (business_id, platform, provider_identity_id)
  where provider_identity_id is not null and deleted_at is null;
