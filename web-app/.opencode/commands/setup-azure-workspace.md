---
description: Configure Azure DevOps org/project/repository/team for this workspace in config/jarvis.yaml
---

Call `config-read` with `section="azure-sync"`. Show current values of `organization`, `project`, `repository`, and `team`.
Also call `workspace-info identifier="." by_directory=true` and show current `repoType`.

For each empty or incorrect value, ask the user to provide it. The `team` field is optional — it defaults to the repository name when empty. Then call `config-write` with `section="azure-sync"` and the updated values.

If `repoType` is missing, ask the user and set it with `workspace-update id="<workspace-id>" repo_type="..."` using one of: `MAIN-MONO-REPO`, `MAIN-NO-REPO`, `MAIN-INDEPENDENT-REPO`, `MODULE-MONO-REPO`, `MODULE-INDEPENDENT-REPO`, `MODULE-NO-REPO`.

Finish by calling `azure-discover` with the new org and project to validate connectivity. Report success or the specific error.
