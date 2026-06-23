Regenerate the AGENTS.md file in the project root with the canonical JARVIS template.

Steps:
1. Read the current AGENTS.md to understand what sections exist
2. Read src/hooks/slash-commands.ts to get the current list of slash commands
3. Run `grep -n "tool(" src/tools/*.ts | grep "const " | wc -l` to get accurate tool count
4. Rebuild AGENTS.md ensuring these sections are accurate and up-to-date:
   - Architecture Constraints (including enum-values facade rule)
   - Mandatory Workflow (kanban lifecycle — use `governance-next-step` as the primary workflow oracle)
   - Governance Oracle (`governance-next-step` tool: query before any card lifecycle action)
   - Guardrails (NEVER/ALWAYS lists — simplified, defer to oracle for workflow rules)
   - Governance Policies (with current count, including governance-next-step)
   - Container-Use Environments
   - CI/CD Pipelines (using correct tool names: gate-run, gate-pass, gate-fail, gate-skip, pipeline-query)
   - Obsidian Vault
   - Git Strategy
   - Configuration System
   - Tool Quick Reference (with accurate tool count and correct tool names per bounded context)
   - Available Skills
   - Available Commands (list all registered slash commands)
   - Knowledge Search section

5. In the Governance section, document `governance-next-step`:
   - Purpose: workflow FSM oracle — returns next required action for any card intent
   - Usage: `governance-next-step card_id="CD-XXX"` (suggest next step) or `governance-next-step card_id="CD-XXX" intent="modify-code"` (validate intent)
   - Valid intents: create-card, groom-card, start-work, modify-code, commit, create-pr, move-card, complete-card
   - Response: { allowed, intent, reason, next: { tool, args, description } }

6. Write the updated content to AGENTS.md
7. Confirm the file has been written and report the sections updated
