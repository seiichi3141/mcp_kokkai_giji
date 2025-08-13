# 国会議事録検索 MCP サーバー

Model Context Protocol (MCP) を使用して、国会議事録検索APIにアクセスできるサーバーです。

## 機能

- 会議単位での議事録検索
- 発言単位での議事録検索
- 特定会議の詳細取得（全文）

## インストール

```bash
npm install
npm run build
```

## 使用方法

### Claude Desktop での設定

`claude_desktop_config.json` に以下を追加:

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

## 利用可能なツール

### search_meetings_simple
会議単位簡易出力。会議の基本情報と該当する発言のリストを取得（最大100件）。

### search_meetings_full  
会議単位出力。会議の全発言本文を含む詳細データを取得（最大10件）。

### search_speeches
発言単位出力。個別の発言本文を取得（最大100件）。

## 共通パラメータ

- `nameOfHouse`: 院名（衆議院、参議院、両院、両院協議会）
- `nameOfMeeting`: 会議名（例：本会議、予算委員会）。半角スペース区切りでOR検索
- `any`: 発言内容の検索キーワード。半角スペース区切りでAND検索
- `speaker`: 発言者名。半角スペース区切りでOR検索
- `from`: 開会日付／始点（YYYY-MM-DD形式）
- `until`: 開会日付／終点（YYYY-MM-DD形式）
- `sessionFrom`: 国会回次From（開始回）
- `sessionTo`: 国会回次To（終了回）
- `issueFrom`: 号数From（開始号）
- `issueTo`: 号数To（終了号）
- `speechNumber`: 発言番号（0以上の整数）
- `speakerPosition`: 発言者肩書き（部分一致）
- `speakerGroup`: 発言者所属会派（部分一致）
- `speakerRole`: 発言者役割（証人、参考人、公述人）
- `supplementAndAppendix`: 追録・附録に限定（true/false）
- `contentsAndIndex`: 目次・索引に限定（true/false）
- `searchRange`: 検索対象箇所（冒頭、本文、冒頭・本文）
- `closing`: 閉会中の会議録に限定（true/false）
- `speechID`: 発言ID
- `issueID`: 会議録ID（21桁の英数字）
- `maximumRecords`: 最大取得件数
  - search_meetings_simple, search_speeches: 1-100（デフォルト30）
  - search_meetings_full: 1-10（デフォルト3）
- `startRecord`: 取得開始位置（デフォルト1）

## API について

このサーバーは国立国会図書館の国会会議録検索システムAPIを使用しています。
詳細: https://kokkai.ndl.go.jp/api.html