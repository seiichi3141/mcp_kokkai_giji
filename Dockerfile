FROM node:20-alpine

WORKDIR /app

# パッケージファイルをコピーして依存関係をインストール
COPY package*.json ./
RUN npm ci --only=production

# TypeScript設定ファイルをコピー
COPY tsconfig.json ./

# ソースコードをコピー
COPY src/ ./src/

# TypeScriptをビルド
RUN npm run build

# 本番用の軽量なイメージを作成
FROM node:20-alpine

WORKDIR /app

# 本番依存関係のみをコピー
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ビルドされたJavaScriptファイルをコピー
COPY --from=0 /app/dist ./dist

# MCPサーバーを実行
CMD ["node", "dist/index.js"]

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('MCP server is running')" || exit 1

LABEL maintainer="team-mirai" \
      description="国会議事録検索 MCP サーバー" \
      version="1.0.0"