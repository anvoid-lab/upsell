---
description: JARVIS Azure DevOps sync workflow — push/pull cards, create PRs, manage teams and area paths
---

You are operating the JARVIS Azure DevOps sync workflow. Use these tools to keep the local kanban board and Azure DevOps in sync.

## Prerequisites

- Azure CLI authenticated: `az login`
- Config set: `config-read section="azure-sync"` must show org, project, repository
- To configure: `config-write section="azure-sync" values={"organization":"MyOrg","project":"MyProject","repository":"MyRepo"}`
- Workspace topology: `workspace-info identifier="." by_directory=true` should expose `repoType`
- If `repoType` is `MAIN-NO-REPO`, run Azure/Git sync in child module workspaces (independent repositories), not from parent workspace.

## Standard Sync Workflow

```
1. azure-status          — check what's mapped vs unmapped
2. azure-push            — push local cards/epics/sprints to Azure
3. azure-pull            — pull Azure changes back
   (or: azure-sync for both in one step)
```

### Check status first
```
azure-status workspace="WORKSPACE" org="MyOrg" project="MyProject"
```

### Push local changes
```
azure-push workspace="WORKSPACE" org="MyOrg" project="MyProject" entity_type="card"
azure-push workspace="WORKSPACE" org="MyOrg" project="MyProject" entity_type="epic"
azure-push workspace="WORKSPACE" org="MyOrg" project="MyProject" entity_type="sprint"
```

Use `dry_run=true` to preview without committing.

### Pull Azure changes
```
azure-pull workspace="WORKSPACE" org="MyOrg" project="MyProject" entity_type="card"
```

## Create a Pull Request

```
azure-pr-create org="MyOrg" project="MyProject" repository="MyRepo"
  title="Add X (CD-XXX)"
  description="..."
  source_branch="feature/CD-XXX-title"
  target_branch="main"
  work_item_ids=[123]
```

## Team + Area Path Setup

If Area Path errors appear during push:

```
/setup-team           — guided team + area path setup
azure-discover org="MyOrg" project="MyProject"   — inspect teams and area paths
```

## Troubleshooting

**401 Unauthorized** — `az login` or set `AZURE_DEVOPS_PAT` env var

**Area Path not found** — run `/setup-team` to provision team and area path

**Cards not appearing in Azure** — check `azure-status` for unmapped cards, then `azure-push`

**Conflict detected on pull** — azure-pull reports conflicts; resolve manually then re-push

## Azure Polling (event-driven sync)

```
azure-poll-start      — start background polling for Azure changes
azure-poll-status     — check polling status
azure-events-list workspace="WORKSPACE"   — list detected change events
azure-poll-stop       — stop polling
```
