import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CacheStore } from "./cache.js";
import {
  handleCheckCache,
  handleRecordRead,
  handleGetSessionMap,
} from "./tools.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export function createServer(): McpServer {
  const store = new CacheStore();

  const server = new McpServer({
    name: "session-cache",
    version,
  });

  server.tool(
    "check_cache",
    "Check if a file has been read and cached in this session. Returns the cached summary on hit, or a miss indicator.",
    { file_path: z.string().describe("Absolute path to the file to check") },
    async ({ file_path }) => {
      const result = await handleCheckCache(store, { file_path });
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "record_read",
    "Record a file read with a concise summary. Call this after reading a file to share knowledge with other subagents.",
    {
      file_path: z.string().describe("Absolute path to the file that was read"),
      summary: z.string().describe("Concise summary of the file contents (2-4 sentences)"),
      symbols: z.array(z.string()).optional().describe("Optional list of key symbols (functions, classes, exports) in the file"),
    },
    async ({ file_path, summary, symbols }) => {
      const result = await handleRecordRead(store, { file_path, summary, symbols });
      if (result.status === "error") {
        return { isError: true, content: [{ type: "text" as const, text: result.message }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  server.tool(
    "get_session_map",
    "Get the full map of all cached file summaries in this session. Useful for planning which files to read.",
    {},
    async () => {
      const result = handleGetSessionMap(store);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  return server;
}

// Start server when run directly (realpathSync resolves npx symlinks)
const currentFile = realpathSync(fileURLToPath(import.meta.url));
const isDirectRun =
  process.argv[1] != null &&
  realpathSync(path.resolve(process.argv[1])) === currentFile;
if (isDirectRun) {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
