---
description: Set up or verify Azure DevOps Team isolation for this workspace
---

This command guides you through configuring the Team and Area Path that JARVIS uses
to isolate this workspace's work items on the Azure DevOps board.

**Step 1 — Read current config**

Call `config-read` with `section="azure-sync"`. Show the current values of `team`,
`areaPath`, and `repository`.

**Step 2 — Determine effective team name**

- If `team` is set, the team name is `team`.
- If `team` is empty, the team name defaults to `repository`.
- If both are empty, ask the user to provide a team name.

Show the user: "Team name: **{teamName}**" and "Area path: **{project}\\{teamName}**"
(or the `areaPath` override if set).

**Step 3 — Confirm or change**

Ask: "Is this team name correct, or would you like to change it?"

If the user wants to change it, update `team` via `config-write` with
`section="azure-sync"` and `values={"team": "<new-name>"}`.

**Step 4 — Verify with azure-discover**

Call `azure-discover` with the configured `org` and `project`. Show the **Teams**
and **Area Paths** sections of the output. Point out whether the configured team
and area path already exist.

**Step 5 — Report**

Summarise:
- Team name that will be used
- Area path that will be set on all pushed work items
- Whether the team and area path exist in Azure (will be auto-created on next push if not)

Finish with: "Run `azure-push` to provision the team and push your work items."
