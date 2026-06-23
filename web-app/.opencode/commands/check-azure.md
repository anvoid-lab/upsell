---
description: Quick Azure DevOps diagnostic for this workspace — auth, config, and connectivity
---

1. Call `config-read` with `section="azure-sync"` — show org, project, repository, authMethod
2. Call `workspace-info identifier="." by_directory=true` and report `repoType` when available
3. Run `az account show -o json` — report account+tenant or "not logged in"
4. If `repoType` is `MAIN-NO-REPO`, skip `git remote -v` and state that version-control checks must run in child module repositories
5. Otherwise, run `git remote -v` — report origin protocol (HTTPS/SSH); flag SSH as requiring azpush
6. If org+project are set, call `azure-discover` — report process template or error

End with one-line verdict: ready or what is missing.
