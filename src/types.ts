export interface CacheEntry {
  summary: string;
  symbols?: string[];
  mtime: number;
  recordedAt: number;
}

export interface CheckCacheInput {
  file_path: string;
}

export interface RecordReadInput {
  file_path: string;
  summary: string;
  symbols?: string[];
}

export interface CacheHitResult {
  status: "hit";
  file_path: string;
  summary: string;
  symbols?: string[];
  recordedAt: number;
}

export interface CacheMissResult {
  status: "miss";
  file_path: string;
  reason: "not_cached" | "stale" | "file_not_found";
}

export type CheckCacheResult = CacheHitResult | CacheMissResult;

export interface RecordReadSuccess {
  status: "recorded";
  file_path: string;
}

export interface RecordReadError {
  status: "error";
  message: string;
}

export type RecordReadResult = RecordReadSuccess | RecordReadError;

export interface SessionMapEntry {
  summary: string;
  symbols?: string[];
  recordedAt: number;
}

export interface SessionMapResult {
  file_count: number;
  files: Record<string, SessionMapEntry>;
}
