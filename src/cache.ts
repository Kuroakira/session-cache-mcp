import path from "node:path";
import type { CacheEntry, SessionMapEntry } from "./types.js";

export class CacheStore {
  private entries: Map<string, CacheEntry> = new Map();

  private normalizePath(filePath: string): string {
    return path.resolve(filePath);
  }

  set(
    filePath: string,
    summary: string,
    symbols?: string[],
    mtime?: number,
  ): void {
    const key = this.normalizePath(filePath);
    this.entries.set(key, {
      summary,
      symbols,
      mtime: mtime ?? 0,
      recordedAt: Date.now(),
    });
  }

  get(filePath: string): CacheEntry | undefined {
    return this.entries.get(this.normalizePath(filePath));
  }

  has(filePath: string): boolean {
    return this.entries.has(this.normalizePath(filePath));
  }

  getAll(): Record<string, SessionMapEntry> {
    const result: Record<string, SessionMapEntry> = {};
    for (const [key, entry] of this.entries) {
      result[key] = {
        summary: entry.summary,
        symbols: entry.symbols,
        recordedAt: entry.recordedAt,
      };
    }
    return result;
  }
}
