-- Template Mode is always anchored to the immutable published template
-- version that supplied its recipe. NOT VALID preserves read access to
-- historical bad rows while enforcing the rule for every new write.
alter table creator_project_versions
  add constraint creator_versions_template_mode_version check (
    mode <> 'template' or template_version_id is not null
  ) NOT VALID;
