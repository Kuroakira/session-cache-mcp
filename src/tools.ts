import fs from "node:fs/promises";
import path from "node:path";
import type { CacheStore } from "./cache.js";
import type {
  CheckCacheInput,
  CheckCacheResult,
  RecordReadInput,
  RecordReadResult,
  SessionMapResult,
} from "./types.js";

export async function handleCheckCache(
  store: CacheStore,
  input: CheckCacheInput,
): Promise<CheckCacheResult> {
  const filePath = path.resolve(input.file_path);

  const entry = store.get(filePath);
  if (!entry) {
    return { status: "miss", file_path: filePath, reason: "not_cached" };
  }

  let currentMtime: number;
  try {
    const stat = await fs.stat(filePath);
    currentMtime = stat.mtimeMs;
  } catch {
    return { status: "miss", file_path: filePath, reason: "file_not_found" };
  }

  if (currentMtime !== entry.mtime) {
    return { status: "miss", file_path: filePath, reason: "stale" };
  }

  return {
    status: "hit",
    file_path: filePath,
    summary: entry.summary,
    symbols: entry.symbols,
    recordedAt: entry.recordedAt,
  };
}

export async function handleRecordRead(
  store: CacheStore,
  input: RecordReadInput,
): Promise<RecordReadResult> {
  const filePath = path.resolve(input.file_path);

  let mtime: number;
  try {
    const stat = await fs.stat(filePath);
    mtime = stat.mtimeMs;
  } catch {
    return { status: "error", message: `File not found: ${filePath}` };
  }

  store.set(filePath, input.summary, input.symbols, mtime);
  return { status: "recorded", file_path: filePath };
}

export function handleGetSessionMap(store: CacheStore): SessionMapResult {
  const files = store.getAll();
  return {
    file_count: Object.keys(files).length,
    files,
  };
}
