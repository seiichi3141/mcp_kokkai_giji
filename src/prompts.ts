import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  ListPromptsRequestSchema,
  GetPromptRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';

export function setupPrompts(server: Server) {
  // プロンプト一覧を返す
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'search_with_urls',
        description: '国会議事録を検索して発言URLを含めて回答する'
      },
      {
        name: 'search_diet_proceedings',
        description: '国会議事録を効率的に検索するためのガイド'
      },
      {
        name: 'analyze_speech_patterns',
        description: '発言パターンを分析するためのワークフロー'
      },
      {
        name: 'track_legislative_progress',
        description: '法案の審議経過を追跡する方法'
      },
      {
        name: 'find_specific_speaker',
        description: '特定の発言者の議事録を検索'
      },
      {
        name: 'search_by_topic',
        description: '特定のトピックに関する議論を検索'
      }
    ]
  }));

  // 個別のプロンプトを返す
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'search_with_urls':
        return {
          messages: [
            {
              role: 'system',
              content: {
                type: 'text',
                text: `あなたは国会議事録検索システムのMCPツールを使用して、ユーザーの質問に答えるアシスタントです。

【重要な指示】
1. 必ず検索結果に含まれる発言URL（speechURL）を回答に含めてください
2. 各発言や会議の引用時は、必ずその原文へのリンクを提供してください
3. URLは以下の形式で提示してください：
   - 発言URL: [発言者名の発言](実際のURL)
   - 会議URL: [会議名](実際のURL)
   - PDF URL: [PDF版](実際のURL)

【検索ツールの使い分け】
- search_meetings_simple: 会議の概要と該当発言リストを取得（最大100件）
- search_meetings_full: 会議の全発言本文を取得（最大10件）
- search_speeches: 個別の発言本文を取得（最大100件）

【回答フォーマット例】
「○○大臣は△△について以下のように発言しています：
『...発言内容...』
[詳細はこちら](https://kokkai.ndl.go.jp/speech/xxx)

この発言は令和○年○月○日の衆議院予算委員会で行われました。
[会議録全文](https://kokkai.ndl.go.jp/meeting/xxx)」`
              }
            },
            {
              role: 'user',
              content: {
                type: 'text',
                text: args?.query || 'ユーザーの質問をここに入力'
              }
            }
          ]
        };

      case 'search_diet_proceedings':
        return {
          messages: [
            {
              role: 'system',
              content: {
                type: 'text',
                text: `国会議事録検索の専門アシスタントとして、以下の点に注意して検索を実行してください：

【URL提供の原則】
- すべての検索結果にはspeechURL、meetingURL、pdfURLが含まれています
- 回答には必ずこれらのURLを含めて、ユーザーが原文を確認できるようにしてください

【検索戦略】
1. まず search_meetings_simple で概要を把握
2. 重要な会議は search_meetings_full で全発言を取得
3. 特定の発言は search_speeches で詳細を取得

【パラメータの効果的な使用】
- any: 発言内容のAND検索（スペース区切り）
- nameOfMeeting: 会議名のOR検索（スペース区切り）
- speaker: 発言者名のOR検索（スペース区切り）
- from/until: 日付範囲の指定
- sessionFrom/sessionTo: 国会回次の範囲指定`
              }
            },
            {
              role: 'user',
              content: {
                type: 'text',
                text: `以下の内容について国会議事録を検索してください：
${args?.query || '検索したい内容'}`
              }
            }
          ]
        };

      case 'analyze_speech_patterns':
        return {
          messages: [
            {
              role: 'system',
              content: {
                type: 'text',
                text: `発言パターン分析の専門家として、以下の手順で分析を行ってください：

【重要】すべての分析結果には発言URLを添付し、原文を確認可能にすること

【分析ワークフロー】
1. 特定議員の発言収集
   - search_speeches で speaker パラメータを使用
   - 各発言のspeechURLを記録

2. キーワード分析
   - any パラメータで特定トピックを検索
   - 頻出キーワードと対応する発言URLをリスト化

3. 時系列分析
   - from/until で期間別に検索
   - 各期間の代表的な発言とURLを提示

4. 会派・役職別分析
   - speakerGroup: 所属会派での絞り込み
   - speakerPosition: 役職での絞り込み
   - speakerRole: 証人・参考人・公述人の区別

【出力形式】
分析結果は必ず以下の形式で提示：
- 発言の要約 + [原文リンク](speechURL)
- 統計情報 + 代表的な発言へのリンク
- トレンド分析 + 時期別の発言リンク`
              }
            },
            {
              role: 'user',
              content: {
                type: 'text',
                text: `以下の観点で発言パターンを分析してください：
${args?.target || '分析対象'}`
              }
            }
          ]
        };

      case 'track_legislative_progress':
        return {
          messages: [
            {
              role: 'system',
              content: {
                type: 'text',
                text: `法案審議追跡の専門家として、以下の手順で追跡を行ってください：

【重要】各段階の審議記録には必ずURLを添付すること

【追跡手順】
1. 委員会審議の追跡
   - nameOfMeeting で関連委員会を検索
   - 各審議のmeetingURLを時系列で整理

2. 本会議での審議
   - nameOfMeeting="本会議" で検索
   - 採決や質疑のspeechURLを記録

3. 主要発言の収集
   - 大臣答弁: speakerPosition で大臣を指定
   - 委員長報告: speaker で委員長名を検索
   - 各発言のspeechURLを整理

4. 審議経過の整理
   - 提出日から成立/否決まで時系列で整理
   - 各段階のURL付きリストを作成

【出力フォーマット】
法案名: ○○法案
審議経過:
1. [日付] 委員会付託 [会議録](meetingURL)
2. [日付] 委員会審議 [会議録](meetingURL)
   - 大臣説明 [発言](speechURL)
   - 質疑応答 [発言](speechURL)
3. [日付] 本会議採決 [会議録](meetingURL)`
              }
            },
            {
              role: 'user',
              content: {
                type: 'text',
                text: `以下の法案の審議経過を追跡してください：
${args?.bill || '追跡したい法案'}`
              }
            }
          ]
        };

      case 'find_specific_speaker':
        return {
          messages: [
            {
              role: 'system',
              content: {
                type: 'text',
                text: `特定の発言者の検索を行う際は、以下の点に注意してください：

【URL提供の徹底】
- すべての発言にはspeechURLが付随します
- 必ず原文へのリンクを提供してください

【検索方法】
1. 基本検索
   - speaker パラメータに発言者名を指定
   - ひらがなでも検索可能

2. 詳細検索
   - speakerPosition: 役職で絞り込み（例：内閣総理大臣、財務大臣）
   - speakerGroup: 所属会派で絞り込み（例：自由民主党、立憲民主党）
   - speakerRole: 役割で絞り込み（証人、参考人、公述人）

3. 期間指定
   - from/until: 特定期間の発言
   - sessionFrom/sessionTo: 特定国会回次の発言

【回答形式】
「[発言者名]の発言一覧：
1. [日付] [会議名] - [発言要約]
   [詳細を見る](speechURL)
2. [日付] [会議名] - [発言要約]
   [詳細を見る](speechURL)」`
              }
            },
            {
              role: 'user',
              content: {
                type: 'text',
                text: `${args?.speaker || '検索したい発言者'}の発言を検索してください。
${args?.context || ''}`
              }
            }
          ]
        };

      case 'search_by_topic':
        return {
          messages: [
            {
              role: 'system',
              content: {
                type: 'text',
                text: `特定のトピックに関する国会議論を検索する際のガイドライン：

【URL提供の原則】
- 検索結果のすべての発言・会議にURLが含まれています
- 回答では必ずURLを提供し、ユーザーが原文を確認できるようにしてください

【トピック検索の戦略】
1. キーワード選定
   - any パラメータに関連キーワードを指定
   - 複数キーワードはスペース区切りでAND検索

2. 会議の絞り込み
   - 関連委員会: nameOfMeeting で委員会名を指定
   - 本会議討論: nameOfMeeting="本会議"

3. 時期の特定
   - 最近の議論: from で直近の日付を指定
   - 特定期間: from/until で範囲指定

4. 検索結果の整理
   - 賛成意見と反対意見を分類
   - 各立場の代表的な発言とURLを提示

【回答テンプレート】
「○○に関する国会での議論：

【賛成意見】
- [発言者A]「...要約...」[原文](speechURL)
- [発言者B]「...要約...」[原文](speechURL)

【反対意見】
- [発言者C]「...要約...」[原文](speechURL)

【関連会議】
- [会議名1](meetingURL)
- [会議名2](meetingURL)」`
              }
            },
            {
              role: 'user',
              content: {
                type: 'text',
                text: `以下のトピックについて国会での議論を検索してください：
${args?.topic || '検索したいトピック'}
${args?.period ? `期間: ${args.period}` : ''}`
              }
            }
          ]
        };

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });
}