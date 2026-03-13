import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "../src/index.js";

describe("MCP Integration", () => {
  let client: Client;
  let tmpDir: string;
  let testFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "session-cache-int-"));
    testFile = path.join(tmpDir, "test.ts");
    await fs.writeFile(testFile, "export const x = 1;");

    const server = createServer();
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    client = new Client({ name: "test-client", version: "1.0.0" });

    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("lists three tools with correct names", async () => {
    const result = await client.listTools();
    const names = result.tools.map((t) => t.name).sort();
    expect(names).toEqual(["check_cache", "get_session_map", "record_read"]);
  });

  it("check_cache returns miss for uncached file", async () => {
    const result = await client.callTool({
      name: "check_cache",
      arguments: { file_path: testFile },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.status).toBe("miss");
    expect(data.reason).toBe("not_cached");
  });

  it("record_read then check_cache returns hit", async () => {
    await client.callTool({
      name: "record_read",
      arguments: {
        file_path: testFile,
        summary: "Exports const x with value 1",
        symbols: ["x"],
      },
    });

    const result = await client.callTool({
      name: "check_cache",
      arguments: { file_path: testFile },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.status).toBe("hit");
    expect(data.summary).toBe("Exports const x with value 1");
    expect(data.symbols).toEqual(["x"]);
  });

  it("get_session_map returns cached entries", async () => {
    await client.callTool({
      name: "record_read",
      arguments: { file_path: testFile, summary: "test file" },
    });

    const result = await client.callTool({
      name: "get_session_map",
      arguments: {},
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.file_count).toBe(1);
  });

  it("detects stale cache after file modification", async () => {
    await client.callTool({
      name: "record_read",
      arguments: { file_path: testFile, summary: "original content" },
    });

    // Modify file to change mtime
    await new Promise((r) => setTimeout(r, 50));
    await fs.writeFile(testFile, "export const x = 2;");

    const result = await client.callTool({
      name: "check_cache",
      arguments: { file_path: testFile },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    const data = JSON.parse(content[0].text);
    expect(data.status).toBe("miss");
    expect(data.reason).toBe("stale");
  });

  it("returns error for record_read with missing file", async () => {
    const missingFile = path.join(tmpDir, "nonexistent.ts");
    const result = await client.callTool({
      name: "record_read",
      arguments: { file_path: missingFile, summary: "does not exist" },
    });
    expect(result.isError).toBe(true);
  });

  it("returns error for check_cache with missing required param", async () => {
    const result = await client.callTool({
      name: "check_cache",
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });
});
