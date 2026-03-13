#!/usr/bin/env node

// SubagentStart hook: injects a brief reminder for subagents to use session cache.
// Reads JSON from stdin (hook input), outputs JSON with additionalContext.

const chunks = [];

process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  const output = {
    additionalContext:
      "Before reading a file, call check_cache from session-cache. After reading, call record_read with a 2-4 sentence summary.",
  };
  process.stdout.write(JSON.stringify(output));
});
process.stdin.on("error", () => {
  const output = {
    additionalContext:
      "Before reading a file, call check_cache from session-cache. After reading, call record_read with a 2-4 sentence summary.",
  };
  process.stdout.write(JSON.stringify(output));
});

process.stdin.resume();
