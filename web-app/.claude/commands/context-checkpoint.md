Save the current JARVIS session checkpoint and compact the context. The session stays open — do NOT call context-session-finish.

Steps:
1. Call `context-session-list` to get the active session ID (status: wip)
2. Call `context-checkpoint` with:
   - `session_id`: the active session ID from step 1
   - `content`: brief summary of what was accomplished so far
   - `current_action`: what is being done right now (optional)
   - `plan_state`: remaining plan with progress markers (optional)
3. Confirm the checkpoint was saved and note the sequence number
4. Run /compact to compact the context window

After the compact completes, call `context-session-start` with the same purpose to restore the session state. The session ID will remain the same — a new checkpoint will be added to the existing sequence.
