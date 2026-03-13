# session-cache-mcp

Claude Code サブエージェント間の冗長なファイル読み込みを排除するセッションスコープ MCP サーバー。

Claude Code が複数のサブエージェントにタスクを委譲すると、各サブエージェントが同じファイルを独立して読み込みます。計測では **66.2% が冗長な読み込み** でした。この MCP サーバーは共有インメモリキャッシュを提供し、サブエージェントが読み込み前にチェック・読み込み後に記録することで、冗長な読み込みを低コストのキャッシュ参照に変換します。

## 仕組み

```
サブエージェントがファイルを必要とする → check_cache → ヒット? 要約を使用。ミス? ファイルを読む → record_read
```

3つのツール:

| ツール | 用途 |
|--------|------|
| `check_cache(file_path)` | ファイルがキャッシュされているか確認。ヒット時は要約を返し、ミス時はその理由を返す。mtime で鮮度を検証。 |
| `record_read(file_path, summary, symbols?)` | ファイル読み込みを簡潔な要約とともに記録。鮮度検証用に mtime も保存。 |
| `get_session_map()` | 全キャッシュの要約一覧を取得。タスク開始時の計画に有用。 |

キャッシュはインメモリで動作し、セッション終了とともに消滅します。永続化、データベース、クリーンアップは不要です。

## インストール

### npx で使用（推奨）

```bash
# プロジェクトレベル
claude mcp add session-cache -- npx -y session-cache-mcp

# ユーザーレベル（全プロジェクト共通）
claude mcp add session-cache -s user -- npx -y session-cache-mcp
```

### グローバルインストール

```bash
npm install -g session-cache-mcp
claude mcp add session-cache -s user -- session-cache-mcp
```

## セットアップ

### 1. CLAUDE.md に行動ルールを追加

[`rules/session-cache.md`](rules/session-cache.md) の内容をプロジェクトの `CLAUDE.md` にコピーしてください:

```markdown
ファイルを読む前に、session-cache サーバーの `check_cache` をファイルパスで呼び出すこと。
キャッシュヒットした場合、要約でカバーされていない詳細が必要でない限り、
ファイルを再読み込みせず要約を使用すること。

ファイルを読んだ後、session-cache サーバーの `record_read` をファイルパスと簡潔な要約
（ファイルの目的、主要なエクスポート、重要な詳細を含む2-4文）で呼び出すこと。

複雑なタスクの開始時に `get_session_map` を呼び出して、このセッションで既に
読み込まれたファイルを確認すること。
```

### 2. （任意）SubagentStart フックを追加

`.claude/settings.json` またはプロジェクトレベルのフック設定に追加:

```json
{
  "hooks": {
    "SubagentStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node node_modules/session-cache-mcp/hooks/subagent-start.js"
          }
        ]
      }
    ]
  }
}
```

これにより、生成される全サブエージェントに簡潔なリマインダーが注入され、CLAUDE.md のルールが強化されます。

## ツール API

### check_cache

```
入力:  { file_path: string }
出力: { status: "hit", summary: string, symbols?: string[], recordedAt: number }
    | { status: "miss", reason: "not_cached" | "stale" | "file_not_found" }
```

### record_read

```
入力:  { file_path: string, summary: string, symbols?: string[] }
出力: { status: "recorded", file_path: string }
```

### get_session_map

```
入力:  {}
出力: { file_count: number, files: Record<string, { summary, symbols?, recordedAt }> }
```

## 開発

```bash
git clone <repo-url>
cd session-cache-mcp
npm install
npm test          # 全テスト実行（34テスト）
npm run build     # TypeScript コンパイル
npm run typecheck # 型チェック（出力なし）
```

## ライセンス

MIT
