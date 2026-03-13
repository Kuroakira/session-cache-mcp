---
name: session-cache-protocol
description: Use when starting a task that involves file reads — injects session-cache usage protocol into context.
user-invokable: false
---

# Session Cache Protocol

You have access to the `session-cache` MCP server. Follow this protocol for all file reads.

## At task start

Call `get_session_map` to see what files have already been read in this session. Use existing summaries to skip redundant reads.

## Before reading a file

Call `check_cache` with the file path.
- **Hit**: Use the cached summary instead of re-reading, unless you need details not covered by the summary.
- **Miss** or **Stale**: Proceed to read the file normally.

## After reading a file

Call `record_read` with the file path and a concise summary (2-4 sentences covering the file's purpose, key exports, and important details).

## When delegating to subagents

Instruct subagents to follow the same protocol: check before reading, record after reading.
