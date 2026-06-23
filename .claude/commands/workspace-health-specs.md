Generate a production health page specification from the latest WorkspaceHealthReport:

1. Look for the most recent workspace health report in `09-Dashboards/` (files matching `workspace-health-*.md`)
2. If no report exists, run `/workspace-health` first to generate one
3. Call `workspace-info` to get workspace name and detected stack
4. Call `workspace-health-specs` tool with the report data, workspace name, and stack
5. Save the generated spec document to `12-Scope-Docs/` using `vault-create-document`
6. Report the spec filename and key endpoints to the user

The spec document includes:
- API contracts: `/health`, `/metrics` (Prometheus), `/health/zabbix`, `/health/stream` (SSE)
- Component tree in Mermaid
- TypeScript interfaces for data model
- Recommended stack based on workspace
- Monitoring integration guide (Grafana, Zabbix)
- Obscure URL pattern for BoC/Infra team access
