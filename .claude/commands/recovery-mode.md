Manage JARVIS recovery mode based on: $ARGUMENTS

**If $ARGUMENTS is empty, "on", or a number (duration in minutes):**

Recovery mode grants a temporary bypass of the blockBashFileRead policy.
This allows bash cat/head/tail on .ts, .md, .yaml, .py and other managed files.
All other governance policies remain active (credentials, git --force, npm publish, etc.).

Steps:
1. Activate: `recovery-mode-activate` (optionally with `duration_minutes=<number>` if a number was given)
2. Perform the necessary file reads for diagnosis or recovery.
3. When done: run `/recovery-mode off` OR wait for auto-expiry.
4. Document what you found: `context-note-add type="note" content="Recovery: <diagnosis>"`

WARNING: This bypass is session-scoped and time-limited. Use only for genuine emergencies.

---

**If $ARGUMENTS is "off", "deactivate", or "disable":**

Deactivate recovery mode for this session.

Steps:
1. Call: `recovery-mode-deactivate`
2. Confirm that blockBashFileRead is restored.
3. Add a context note summarizing what was diagnosed: `context-note-add type="note" content="Recovery mode used: <what you found>"`

---

**If $ARGUMENTS is "status" or "check":**

Check the current recovery mode state for this session.

Steps:
1. Call: `recovery-mode-status`
