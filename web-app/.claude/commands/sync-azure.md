Execute the following Azure DevOps sync workflow:

1. Run `config-read section="azure-sync"` to verify org/project are configured, then `azure-discover` to confirm connectivity
2. Run `azure-status` to see current sync state (synced, stale, unmapped items)
3. Based on the status:
   - If there are unmapped local cards: run `azure-push entity_type="card"` to push them
   - If there are unmapped local epics: run `azure-push entity_type="epic"` to push them
   - If there are unmapped local sprints: run `azure-push entity_type="sprint"` to push them
   - If there are unmapped Azure items: run `azure-pull entity_type="card"` (and epic/sprint as needed)
   - If everything is mapped: run `azure-sync` for bidirectional sync
4. Run `azure-status` again to confirm sync is clean
5. Report the final state to the user
