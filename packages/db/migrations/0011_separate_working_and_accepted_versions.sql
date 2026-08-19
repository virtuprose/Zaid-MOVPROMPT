-- A project needs two independent immutable-version pointers:
--   * current_working_version_id: the draft/render the user is currently viewing
--   * current_accepted_version_id: the last version with a completed render
--
-- Preserve every existing current selection as the working version first.
ALTER TABLE creator_projects
  ADD COLUMN current_working_version_id uuid;

UPDATE creator_projects
SET current_working_version_id = current_accepted_version_id
WHERE current_working_version_id IS NULL;

ALTER TABLE creator_projects
  ADD CONSTRAINT creator_projects_current_working_version_fk
  FOREIGN KEY (current_working_version_id, id, user_id)
  REFERENCES creator_project_versions(id, project_id, user_id)
  ON DELETE RESTRICT;

-- Only a completed render is authoritative evidence that a version was
-- accepted. Existing version rows remain intact and remain selected through
-- current_working_version_id even when this repair clears an unproven pointer.
UPDATE creator_projects AS project
SET current_accepted_version_id = (
  SELECT run.project_version_id
  FROM render_runs AS run
  WHERE run.project_id = project.id
    AND run.user_id = project.user_id
    AND run.status = 'completed'
  ORDER BY run.completed_at DESC NULLS LAST, run.created_at DESC, run.id DESC
  LIMIT 1
);

