# CLAUDE.md

このファイルは、このリポジトリでClaude Code (claude.ai/code)が作業する際のガイダンスを提供します。

## 重要な指示

- **常に日本語で回答する**
- このプロジェクトは国会議事録検索MCPサーバーのため、日本語での対応が必須

## 開発コマンド

### ビルドとテスト
```bash
# TypeScriptコンパイル
npm run build

# 開発モード実行
npm run dev

# 本番実行
npm start

# テスト実行
npm test
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジ付き

# 単一テストファイル実行
npm test -- --testPathPattern=KokkaiGijiServer.test.ts
```

### Docker関連コマンド
```bash
# ローカルビルド
docker build -t kokkai-giji-mcp .

# Docker Hub用のタグ付け
docker build -t your-dockerhub-username/kokkai-giji-mcp:latest .
docker build -t your-dockerhub-username/kokkai-giji-mcp:1.0.0 .

# Docker Hubにプッシュ
docker login
docker push your-dockerhub-username/kokkai-giji-mcp:latest
docker push your-dockerhub-username/kokkai-giji-mcp:1.0.0

# Docker Composeでサービス起動
docker-compose up -d

# コンテナの状態確認
docker-compose ps

# ログ確認
docker-compose logs -f kokkai-giji-mcp

# サービス停止
docker-compose down
```

## プロジェクト構造とアーキテクチャ

このプロジェクトは**Model Context Protocol (MCP) サーバー**として実装されており、国立国会図書館の国会議事録検索APIをMCPツールとして提供します。

### 主要コンポーネント

#### KokkaiGijiServer クラス (`src/index.ts`)
- MCPサーバーのメインクラス
- 3つの検索ツールを提供：
  - `search_meetings_simple`: 会議単位簡易出力（最大100件）
  - `search_meetings_full`: 会議単位詳細出力（最大10件）
  - `search_speeches`: 発言単位出力（最大100件）
- 国会議事録検索API (`https://kokkai.ndl.go.jp/api`) との通信を担当

#### プロンプト機能 (`src/prompts.ts`)
- AIアシスタント向けのプロンプトテンプレートを提供
- 6種類のプロンプトパターン：
  - `search_with_urls`: URL付き検索結果の提供
  - `search_diet_proceedings`: 効率的な検索戦略
  - `analyze_speech_patterns`: 発言パターン分析
  - `track_legislative_progress`: 法案審議追跡
  - `find_specific_speaker`: 特定発言者検索
  - `search_by_topic`: トピック別議論検索

### 技術スタック
- **ランタイム**: Node.js（TypeScript使用）
- **SDK**: `@modelcontextprotocol/sdk` v1.17.2
- **テスト**: Jest（ts-jest使用）
- **ビルド**: TypeScriptコンパイラー（tsc）

### API応答の構造

#### SearchParamsインターフェース
共通検索パラメータを定義。院名、会議名、発言者、日付範囲、国会回次などの絞り込み条件を提供。

#### 応答データ型の階層
```
SpeechRecordBase（基本発言情報）
  ↓ 継承
SpeechRecordFull（発言本文含む）
  ↓ 継承
SpeechRecordDetail（会議情報含む詳細）

MeetingRecord（会議情報 + SpeechRecord配列）
```

### 重要な実装パターン

#### URLの必須提供
すべての検索結果には以下のURLが含まれ、ユーザーが原文を確認できるよう設計：
- `speechURL`: 個別発言への直接リンク
- `meetingURL`: 会議録全体へのリンク
- `pdfURL`: PDF版へのリンク（存在する場合）

#### エラーハンドリング
APIエラーとローカルエラーの両方に対応し、ユーザーフレンドリーなメッセージを返却。

#### レスポンス制限
各ツールで異なる最大件数制限を設定し、大量データの処理に配慮。

## テスト戦略

テストはMCPサーバーの機能単位でモック化して実行。`global.fetch`をモックしてAPIレスポンスをシミュレート。

## Docker対応

### Dockerでの実行

```bash
# Dockerイメージをビルド
docker build -t kokkai-giji-mcp .

# Docker Composeで実行
docker-compose up -d

# ログを確認
docker-compose logs -f kokkai-giji-mcp
```

### Docker設定ファイル

- `Dockerfile`: マルチステージビルドで最適化されたイメージ
- `docker-compose.yml`: サービス定義とネットワーク設定
- `.dockerignore`: 不要なファイルをビルドコンテキストから除外

## Claude Desktop設定例

### 通常実行の場合
```json
{
  "mcpServers": {
    "kokkai-giji": {
      "command": "node",
      "args": ["/path/to/mcp_kokkai_giji/dist/index.js"]
    }
  }
}
```

### Docker実行の場合

#### ローカルビルドイメージを使用
```json
{
  "mcpServers": {
    "kokkai-giji": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "kokkai-giji-mcp",
        "node",
        "dist/index.js"
      ]
    }
  }
}
```

#### Docker Hubイメージを使用
```json
{
  "mcpServers": {
    "kokkai-giji": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "your-dockerhub-username/kokkai-giji-mcp:latest"
      ]
    }
  }
}
```