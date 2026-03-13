# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build        # TypeScript compile + add shebang (tsc && node scripts/add-shebang.js)
npm test             # Run all tests (vitest run)
npm run test:watch   # Watch mode
npm run typecheck    # Type check without emitting (tsc --noEmit)
npx vitest run tests/cache.test.ts  # Run a single test file
```

## Architecture

Session-scoped MCP server that caches file read summaries across Claude Code subagents. In-memory only — no persistence.

### Source (`src/`)

- **`index.ts`** — MCP server setup, tool registration, direct-run detection (resolves npx symlinks via `realpathSync`)
- **`cache.ts`** — `CacheStore` class: in-memory `Map<normalizedPath, CacheEntry>` with path normalization
- **`tools.ts`** — Tool handlers (`handleCheckCache`, `handleRecordRead`, `handleGetSessionMap`). `check_cache` detects stale entries by comparing stored mtime with current file mtime
- **`types.ts`** — All interfaces and type aliases

### Plugin assets

This project is both an npm package and a Claude Code plugin:

- **`skills/session-cache-protocol/`** — Skill that injects the cache usage protocol into context (invokable by other plugins as `session-cache:session-cache-protocol`)
- **`hooks/hooks.json`** — Registers `SubagentStart` hook automatically when installed as a plugin
- **`hooks/subagent-start.js`** — Injects cache reminder into subagent `additionalContext`

### Key design decisions

- Staleness detection uses `fs.stat().mtimeMs` comparison, not content hashing
- Path normalization via `path.resolve()` ensures consistent cache keys
- `createServer()` is exported for testing; direct-run guard uses `realpathSync` to handle npx symlinks
