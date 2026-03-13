import { describe, it, expect, beforeEach } from "vitest";
import { CacheStore } from "../src/cache.js";

describe("CacheStore", () => {
  let store: CacheStore;

  beforeEach(() => {
    store = new CacheStore();
  });

  describe("set()", () => {
    it("stores an entry with mtime", () => {
      store.set("/tmp/foo.ts", "A TypeScript file", undefined, 1000);
      const entry = store.get("/tmp/foo.ts");
      expect(entry).toBeDefined();
      expect(entry!.summary).toBe("A TypeScript file");
      expect(entry!.mtime).toBe(1000);
    });

    it("stores an entry with symbols", () => {
      store.set("/tmp/foo.ts", "exports Foo class", ["Foo", "Bar"], 1000);
      const entry = store.get("/tmp/foo.ts");
      expect(entry!.symbols).toEqual(["Foo", "Bar"]);
    });

    it("records a timestamp", () => {
      const before = Date.now();
      store.set("/tmp/foo.ts", "summary", undefined, 1000);
      const after = Date.now();
      const entry = store.get("/tmp/foo.ts");
      expect(entry!.recordedAt).toBeGreaterThanOrEqual(before);
      expect(entry!.recordedAt).toBeLessThanOrEqual(after);
    });
  });

  describe("get()", () => {
    it("returns undefined for missing paths", () => {
      expect(store.get("/tmp/nonexistent.ts")).toBeUndefined();
    });

    it("returns entry by normalized path", () => {
      store.set("/tmp/./foo/../foo.ts", "summary", undefined, 1000);
      expect(store.get("/tmp/foo.ts")).toBeDefined();
      expect(store.get("/tmp/foo.ts")!.summary).toBe("summary");
    });
  });

  describe("has()", () => {
    it("returns false for missing paths", () => {
      expect(store.has("/tmp/foo.ts")).toBe(false);
    });

    it("returns true for stored paths", () => {
      store.set("/tmp/foo.ts", "summary", undefined, 1000);
      expect(store.has("/tmp/foo.ts")).toBe(true);
    });
  });

  describe("getAll()", () => {
    it("returns empty record when no entries", () => {
      expect(store.getAll()).toEqual({});
    });

    it("returns all stored entries", () => {
      store.set("/tmp/a.ts", "file A", undefined, 1000);
      store.set("/tmp/b.ts", "file B", ["X"], 2000);
      const all = store.getAll();
      expect(Object.keys(all)).toHaveLength(2);
      expect(all["/tmp/a.ts"].summary).toBe("file A");
      expect(all["/tmp/b.ts"].summary).toBe("file B");
      expect(all["/tmp/b.ts"].symbols).toEqual(["X"]);
    });
  });

  describe("path normalization", () => {
    it("resolves relative segments", () => {
      store.set("/tmp/src/../src/foo.ts", "summary", undefined, 1000);
      expect(store.get("/tmp/src/foo.ts")).toBeDefined();
    });

    it("resolves dot segments", () => {
      store.set("/tmp/./foo.ts", "summary", undefined, 1000);
      expect(store.get("/tmp/foo.ts")).toBeDefined();
    });

    it("treats different paths to same file as same entry", () => {
      store.set("/tmp/a/../b.ts", "first", undefined, 1000);
      store.set("/tmp/b.ts", "second", undefined, 2000);
      expect(store.get("/tmp/b.ts")!.summary).toBe("second");
    });
  });

  describe("overwrite behavior", () => {
    it("later set replaces earlier for same path", () => {
      store.set("/tmp/foo.ts", "old summary", ["OldSym"], 1000);
      store.set("/tmp/foo.ts", "new summary", ["NewSym"], 2000);
      const entry = store.get("/tmp/foo.ts");
      expect(entry!.summary).toBe("new summary");
      expect(entry!.symbols).toEqual(["NewSym"]);
      expect(entry!.mtime).toBe(2000);
    });
  });
});
