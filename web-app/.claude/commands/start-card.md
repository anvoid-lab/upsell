Execute the card start workflow for card $ARGUMENTS.

If $ARGUMENTS is empty, run `kanban-board-view` and ask the user which card to start.

Otherwise:

1. Run `governance-next-step card_id="$ARGUMENTS"` to get the oracle's recommended next action
2. Follow the oracle's response — it will tell you the exact tool and args to call next
3. After each step, call `governance-next-step` again to get the next action
4. Repeat until the card is in **doing** status
5. Start a context session: `context-session-start purpose="$ARGUMENTS: <card title>"`
6. Report the card's brief via `kanban-card-brief card_id="$ARGUMENTS"`

The governance oracle handles all status-specific logic (grooming validation, sprint/agent assignment, scope doc creation). Trust its prescriptive output instead of hardcoding the workflow.

## Manual fallback (if oracle unavailable)

If `governance-next-step` is not available, use this sequence:

1. `kanban-card-get card_id="$ARGUMENTS"` to see current state
2. Based on status:
   - **backlog**: move to grooming, create scope doc, add AC, validate grooming, move to ready
   - **grooming**: `kanban-grooming-validate`, complete missing items, move to ready
   - **ready**: assign agent + sprint, move to doing
   - **doing**: already started — report status
3. When in **ready**:
   - `kanban-card-assign card_id="$ARGUMENTS" agent="claude"`
   - Ensure active sprint, assign card
   - `kanban-card-move card_id="$ARGUMENTS" status="doing"`
