# session-cache-mcp

A session-scoped MCP server that eliminates redundant file reads across Claude Code subagents.

When Claude Code delegates tasks to multiple subagents, each subagent independently reads the same files -- measured at **66.2% redundancy**. This MCP server provides a shared in-memory cache where subagents check before reading and record after reading, turning redundant file reads into cheap cache lookups.

## How It Works

```
Subagent needs file → check_cache → Hit? Use summary. Miss? Read file → record_read
```

Three tools:

| Tool | Purpose |
|------|---------|
| `check_cache(file_path)` | Check if a file has been cached. Returns summary on hit, miss indicator otherwise. Detects stale entries via mtime. |
| `record_read(file_path, summary, symbols?)` | Record a file read with a concise summary. Stores the file's mtime for staleness detection. |
| `get_session_map()` | Get all cached file summaries. Useful for planning at the start of a task. |

The cache lives in-memory and dies with the session -- no persistence, no database, no cleanup needed.

## Installation

### With npx (recommended)

```bash
# Project-level
claude mcp add session-cache -- npx -y session-cache-mcp

# User-level (shared across projects)
claude mcp add session-cache -s user -- npx -y session-cache-mcp
```

### Global install

```bash
npm install -g session-cache-mcp
claude mcp add session-cache -s user -- session-cache-mcp
```

## Setup

### As a Claude Code plugin (recommended)

When installed as a plugin, the usage protocol (skill) and SubagentStart hook are automatically available — no manual CLAUDE.md or settings.json configuration needed.

Other plugins (e.g., claude-praxis) can invoke the `session-cache:session-cache-protocol` skill to inject the cache protocol into their workflows.

### As an npm MCP server (manual setup)

If using via `npx` or global install without the plugin system, add the following to your project's `CLAUDE.md`:

```markdown
Before reading any file, call `check_cache` from the session-cache server with the file path.
If the cache returns a hit, use the summary instead of re-reading the file unless you need
details not covered by the summary.

After reading a file, call `record_read` from the session-cache server with the file path
and a concise summary (2-4 sentences covering the file's purpose, key exports, and important details).

At the start of a complex task, call `get_session_map` to see what files have already been
read in this session.
```

## Tool API

### check_cache

```
Input:  { file_path: string }
Output: { status: "hit", summary: string, symbols?: string[], recordedAt: number }
      | { status: "miss", reason: "not_cached" | "stale" | "file_not_found" }
```

### record_read

```
Input:  { file_path: string, summary: string, symbols?: string[] }
Output: { status: "recorded", file_path: string }
```

### get_session_map

```
Input:  {}
Output: { file_count: number, files: Record<string, { summary, symbols?, recordedAt }> }
```

## Development

```bash
git clone <repo-url>
cd session-cache-mcp
npm install
npm test          # Run all tests (34 tests)
npm run build     # Compile TypeScript
npm run typecheck # Type check without emitting
```

## License

MIT
