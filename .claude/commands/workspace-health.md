Run a workspace-wide deploy health check:

1. Call `workspace-info` to discover the current workspace and list services
2. Call `deploy-manifest-group-list` to find all manifest groups
3. For each service/manifest, gather checks:
   - Run `deploy-preflight` for config, env vars, DNS/TLS health
   - Run `deploy-infra-check` for infrastructure resource existence (if resources are declared)
   - Run `deploy-manifest-audit` for security/compliance checks
4. Collect all check results and call `workspace-deploy-health` tool with the aggregated data
5. Save the vault document output to `09-Dashboards/` using `vault-create-document`
6. Add a `context-note` with the overall score and critical issues count

Report the final score and any blocking issues to the user.
