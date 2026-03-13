# Session Cache Rules

Before reading any file, call `check_cache` from the session-cache server with the file path. If the cache returns a hit, use the summary instead of re-reading the file unless you need details not covered by the summary.

After reading a file, call `record_read` from the session-cache server with the file path and a concise summary (2-4 sentences covering the file's purpose, key exports, and important details).

At the start of a complex task, call `get_session_map` to see what files have already been read in this session.
