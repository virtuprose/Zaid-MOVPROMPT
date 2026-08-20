-- Footage becomes usable only after the API derives its metadata from a
-- decodable MP4/MOV. WebM was never supported by the browser creator path.
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
  );

alter table guest_claim_assets
  drop constraint if exists guest_claim_assets_footage_metadata;

alter table guest_claim_assets
  add constraint guest_claim_assets_footage_metadata check (
    asset_kind <> 'footage' or (
      mime_type in ('video/mp4', 'video/quicktime')
      and duration_ms > 0
      and duration_ms <= 600000
    )
  );
