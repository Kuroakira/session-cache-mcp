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

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "session-cache": {
      "command": "npx",
      "args": ["-y", "session-cache-mcp"]
    }
  }
}
```

### Global install

```bash
npm install -g session-cache-mcp
```

```json
{
  "mcpServers": {
    "session-cache": {
      "command": "session-cache-mcp"
    }
  }
}
```

## Setup

### 1. Add behavioral rules to CLAUDE.md

Copy the contents of [`rules/session-cache.md`](rules/session-cache.md) into your project's `CLAUDE.md`:

```markdown
Before reading any file, call `check_cache` from the session-cache server with the file path.
If the cache returns a hit, use the summary instead of re-reading the file unless you need
details not covered by the summary.

After reading a file, call `record_read` from the session-cache server with the file path
and a concise summary (2-4 sentences covering the file's purpose, key exports, and important details).

At the start of a complex task, call `get_session_map` to see what files have already been
read in this session.
```

### 2. (Optional) Add SubagentStart hook

Add to your `.claude/settings.json` or project-level hook config:

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node node_modules/session-cache-mcp/hooks/subagent-start.js"
          }
        ]
      }
    ]
  }
}
```

This injects a brief reminder into every spawned subagent, reinforcing the CLAUDE.md rules.

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
