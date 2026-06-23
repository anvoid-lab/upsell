Start Jarvis background services on demand.

Services managed:
- **MCP HTTP server** (`dist/mcp-server-http.js`) — required for ADK agent subprocesses to connect (port $MCP_HTTP_PORT or 3001)
- **Ollama** — required for RAG and OllamaLlm (port 11434)

## Workflow

1. Determine the MCP HTTP port: use `$MCP_HTTP_PORT` env var if set, otherwise 3001.

2. Check if MCP HTTP server is already running:
   ```bash
   lsof -ti :3001 2>/dev/null
   ```
   If a PID is returned, the server is already up — report it and skip start.

3. If not running, check that the build exists:
   ```bash
   ls dist/mcp-server-http.js 2>/dev/null
   ```
   If missing, run `npm run build` first.

4. Start MCP HTTP server as background process:
   ```bash
   nohup node dist/mcp-server-http.js > /tmp/jarvis-mcp-http.log 2>&1 &
   echo $!
   ```
   Wait 1 second, then verify port is now listening (`lsof -ti :3001`).

5. Check Ollama health:
   ```bash
   curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1 && echo "ok" || echo "down"
   ```
   If Ollama is down, report it — but do NOT attempt to start it (managed by the OS).

6. Report final status table:
   - MCP HTTP server: running (PID XXXX, port 3001) | started | already running
   - Ollama: reachable at http://localhost:11434 | NOT running (RAG and OllamaLlm unavailable)

If any step fails, show the error clearly and suggest the user run `npm run build` or start Ollama manually.
