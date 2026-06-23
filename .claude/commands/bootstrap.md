# Bootstrap Jarvis

Initialize this workspace for use with the JARVIS MCP Plugin.

## Steps

1. Call `mcp__jarvis__bootstrap` with no arguments (uses current workspace directory automatically)
2. Report what was created or already existed:
   - AGENTS.md status
   - Directories created
   - `config/jarvis.yaml` status
   - Claude Code settings updated (`~/.claude/settings.json`)
   - Global commands installed (`~/.claude/commands/`)
   - Workspace commands created (`.claude/commands/`)
   - `CLAUDE.md` status
3. Call `rag-oracle-index` with `directory="obsidian-vault/tool-reference"` to populate the ORACLE index
   - This enables `rag-oracle-search` to return tool usage guidance in all sessions
   - Operation is idempotent — safe to run multiple times
4. If `CLAUDE.md` was created, inform the user they can customize it for their project
5. If Claude Code settings were updated, inform the user they may need to restart Claude Code for the MCP server registration to take effect

## Notes

- All operations are idempotent — safe to run multiple times
- Existing files and config are never overwritten
- After bootstrapping, use `/healthcheck` to verify environment readiness
