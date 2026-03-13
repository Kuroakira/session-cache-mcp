import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CacheStore } from "../src/cache.js";
import {
  handleCheckCache,
  handleRecordRead,
  handleGetSessionMap,
} from "../src/tools.js";

describe("Tool Handlers", () => {
  let store: CacheStore;
  let tmpDir: string;
  let testFile: string;

  beforeEach(async () => {
    store = new CacheStore();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "session-cache-test-"));
    testFile = path.join(tmpDir, "test.ts");
    await fs.writeFile(testFile, "export const x = 1;");
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("handleCheckCache", () => {
    it("returns miss for uncached file", async () => {
      const result = await handleCheckCache(store, { file_path: testFile });
      expect(result.status).toBe("miss");
      if (result.status === "miss") {
        expect(result.reason).toBe("not_cached");
      }
    });

    it("returns hit with valid mtime", async () => {
      const stat = await fs.stat(testFile);
      store.set(testFile, "exports x", ["x"], stat.mtimeMs);

      const result = await handleCheckCache(store, { file_path: testFile });
      expect(result.status).toBe("hit");
      if (result.status === "hit") {
        expect(result.summary).toBe("exports x");
        expect(result.symbols).toEqual(["x"]);
      }
    });

    it("returns stale miss when mtime changed", async () => {
      store.set(testFile, "old summary", undefined, 0);

      const result = await handleCheckCache(store, { file_path: testFile });
      expect(result.status).toBe("miss");
      if (result.status === "miss") {
        expect(result.reason).toBe("stale");
      }
    });

    it("returns file_not_found miss when file deleted", async () => {
      store.set(testFile, "summary", undefined, 1000);
      await fs.rm(testFile);

      const result = await handleCheckCache(store, { file_path: testFile });
      expect(result.status).toBe("miss");
      if (result.status === "miss") {
        expect(result.reason).toBe("file_not_found");
      }
    });

    it("normalizes file path", async () => {
      const stat = await fs.stat(testFile);
      store.set(testFile, "summary", undefined, stat.mtimeMs);

      const unnormalizedPath = path.join(tmpDir, "./test.ts");
      const result = await handleCheckCache(store, {
        file_path: unnormalizedPath,
      });
      expect(result.status).toBe("hit");
    });
  });

  describe("handleRecordRead", () => {
    it("stores entry and can be retrieved via check_cache", async () => {
      const result = await handleRecordRead(store, {
        file_path: testFile,
        summary: "exports const x",
      });
      expect(result.status).toBe("recorded");
      expect(result.file_path).toBe(path.resolve(testFile));

      const check = await handleCheckCache(store, { file_path: testFile });
      expect(check.status).toBe("hit");
      if (check.status === "hit") {
        expect(check.summary).toBe("exports const x");
      }
    });

    it("stores entry with optional symbols", async () => {
      await handleRecordRead(store, {
        file_path: testFile,
        summary: "exports x",
        symbols: ["x"],
      });

      const check = await handleCheckCache(store, { file_path: testFile });
      if (check.status === "hit") {
        expect(check.symbols).toEqual(["x"]);
      }
    });

    it("overwrites existing entry", async () => {
      await handleRecordRead(store, {
        file_path: testFile,
        summary: "old",
      });
      await handleRecordRead(store, {
        file_path: testFile,
        summary: "new",
      });

      const check = await handleCheckCache(store, { file_path: testFile });
      if (check.status === "hit") {
        expect(check.summary).toBe("new");
      }
    });

    it("returns file_not_found for deleted file", async () => {
      await fs.rm(testFile);
      const result = await handleRecordRead(store, {
        file_path: testFile,
        summary: "summary",
      });
      expect(result.status).toBe("error");
    });
  });

  describe("handleGetSessionMap", () => {
    it("returns empty map when no entries", () => {
      const result = handleGetSessionMap(store);
      expect(result.file_count).toBe(0);
      expect(result.files).toEqual({});
    });

    it("returns all cached entries", async () => {
      await handleRecordRead(store, {
        file_path: testFile,
        summary: "test file",
        symbols: ["x"],
      });

      const file2 = path.join(tmpDir, "other.ts");
      await fs.writeFile(file2, "export const y = 2;");
      await handleRecordRead(store, {
        file_path: file2,
        summary: "other file",
      });

      const result = handleGetSessionMap(store);
      expect(result.file_count).toBe(2);
      expect(Object.keys(result.files)).toHaveLength(2);
    });
  });
});
