-- Footage becomes usable only after the API derives its metadata from a
-- decodable MP4/MOV. Existing WebM rows remain readable during the explicit
-- migration/reconciliation window, but this NOT VALID constraint still rejects
-- every new WebM insert or update immediately. Do not VALIDATE it until the
-- legacy rows have been converted, retired, or surfaced to their owners.
alter table creator_project_assets
  drop constraint if exists creator_assets_footage_metadata;

alter table creator_project_assets
  add constraint creator_assets_footage_metadata check (
    asset_kind <> 'footage' or (
      mime_type in ('video/mp4', 'video/quicktime')
      and size_bytes > 0
      and duration_ms > 0
      and duration_ms <= 600000
      and checksum_sha256 is not null
    )
  ) NOT VALID;

alter table guest_claim_assets
  drop constraint if exists guest_claim_assets_footage_metadata;

alter table guest_claim_assets
  add constraint guest_claim_assets_footage_metadata check (
    asset_kind <> 'footage' or (
      mime_type in ('video/mp4', 'video/quicktime')
      and duration_ms > 0
      and duration_ms <= 600000
    )
  ) NOT VALID;
