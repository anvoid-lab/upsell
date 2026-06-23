Run the JARVIS healthcheck and provide actionable guidance:

1. Execute `healthcheck`
2. Analyze the results:
   - For each **fail** result: explain what is wrong and how to fix it
   - For each **warn** result: explain what is optional but recommended
   - For each **pass** result: briefly confirm it is good
3. If all probes pass, confirm the environment is healthy
4. If RAG index shows 0 documents, suggest running `rag-index` to index the codebase
5. If ORACLE index shows 0 documents: warn the user and suggest running `rag-oracle-index directory="obsidian-vault/tool-reference"` to restore tool usage guidance (or run `/bootstrap` which does this automatically)
6. Summarize overall health status
