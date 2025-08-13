#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { setupPrompts } from './prompts.js';

interface SearchParams {
  startRecord?: number;
  maximumRecords?: number;
  nameOfHouse?: string;
  nameOfMeeting?: string;
  any?: string;
  speaker?: string;
  from?: string;
  until?: string;
  supplementAndAppendix?: boolean;
  contentsAndIndex?: boolean;
  searchRange?: string;
  closing?: boolean;
  speechNumber?: number;
  speakerPosition?: string;
  speakerGroup?: string;
  speakerRole?: string;
  speechID?: string;
  issueID?: string;
  sessionFrom?: number;
  sessionTo?: number;
  issueFrom?: number;
  issueTo?: number;
  recordPacking?: 'json' | 'xml';
}

interface SpeechRecordBase {
  speechID: string;
  speechOrder: number;
  speaker: string;
  speechURL: string;
}

interface SpeechRecordFull extends SpeechRecordBase {
  speakerYomi?: string;
  speakerGroup?: string;
  speakerPosition?: string;
  speakerRole?: string;
  speech: string;
  startPage: number;
  createTime: string;
  updateTime: string;
}

interface SpeechRecordDetail extends SpeechRecordFull {
  issueID: string;
  imageKind: string;
  searchObject: string;
  session: number;
  nameOfHouse: string;
  nameOfMeeting: string;
  issue: string;
  date: string;
  closing?: boolean;
  meetingURL: string;
  pdfURL?: string;
}

interface MeetingRecord {
  issueID: string;
  imageKind: string;
  searchObject: string;
  session: number;
  nameOfHouse: string;
  nameOfMeeting: string;
  issue: string;
  date: string;
  closing?: boolean;
  speechRecord?: (SpeechRecordBase | SpeechRecordFull)[];
  meetingURL: string;
  pdfURL?: string;
}

class KokkaiGijiServer {
  private server: Server;
  private baseUrl = 'https://kokkai.ndl.go.jp/api';

  constructor() {
    this.server = new Server(
      {
        name: 'kokkai-giji-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    setupPrompts(this.server);
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_meetings_simple',
          description: '国会の会議を検索します（会議単位簡易出力）。会議の基本情報と該当する発言のリストを取得します。最大100件まで取得可能。',
          inputSchema: {
            type: 'object',
            properties: {
              nameOfHouse: {
                type: 'string',
                description: '院名（衆議院、参議院、両院、両院協議会）',
                enum: ['衆議院', '参議院', '両院', '両院協議会']
              },
              nameOfMeeting: {
                type: 'string',
                description: '会議名（例：本会議、予算委員会）。半角スペース区切りでOR検索'
              },
              any: {
                type: 'string',
                description: '発言内容の検索キーワード。半角スペース区切りでAND検索'
              },
              speaker: {
                type: 'string',
                description: '発言者名。半角スペース区切りでOR検索'
              },
              from: {
                type: 'string',
                description: '開会日付／始点（YYYY-MM-DD形式）'
              },
              until: {
                type: 'string',
                description: '開会日付／終点（YYYY-MM-DD形式）'
              },
              sessionFrom: {
                type: 'number',
                description: '国会回次From（開始回）'
              },
              sessionTo: {
                type: 'number',
                description: '国会回次To（終了回）'
              },
              issueFrom: {
                type: 'number',
                description: '号数From（開始号）'
              },
              issueTo: {
                type: 'number',
                description: '号数To（終了号）'
              },
              speechNumber: {
                type: 'number',
                description: '発言番号（0以上の整数）'
              },
              speakerPosition: {
                type: 'string',
                description: '発言者肩書き（部分一致）'
              },
              speakerGroup: {
                type: 'string',
                description: '発言者所属会派（部分一致）'
              },
              speakerRole: {
                type: 'string',
                description: '発言者役割（証人、参考人、公述人）',
                enum: ['証人', '参考人', '公述人']
              },
              supplementAndAppendix: {
                type: 'boolean',
                description: '追録・附録に限定（デフォルト：false）'
              },
              contentsAndIndex: {
                type: 'boolean',
                description: '目次・索引に限定（デフォルト：false）'
              },
              searchRange: {
                type: 'string',
                description: '検索対象箇所（冒頭、本文、冒頭・本文）',
                enum: ['冒頭', '本文', '冒頭・本文']
              },
              closing: {
                type: 'boolean',
                description: '閉会中の会議録に限定（デフォルト：false）'
              },
              speechID: {
                type: 'string',
                description: '発言ID（例：100105254X00119470520_000）'
              },
              issueID: {
                type: 'string',
                description: '会議録ID（21桁の英数字）'
              },
              maximumRecords: {
                type: 'number',
                description: '最大取得件数（1-100、デフォルト30）',
                minimum: 1,
                maximum: 100
              },
              startRecord: {
                type: 'number',
                description: '取得開始位置（デフォルト1）',
                minimum: 1
              }
            }
          }
        },
        {
          name: 'search_meetings_full',
          description: '国会の会議を検索します（会議単位出力）。会議の全発言本文を含む詳細データを取得します。最大10件まで取得可能。',
          inputSchema: {
            type: 'object',
            properties: {
              nameOfHouse: {
                type: 'string',
                description: '院名（衆議院、参議院、両院、両院協議会）',
                enum: ['衆議院', '参議院', '両院', '両院協議会']
              },
              nameOfMeeting: {
                type: 'string',
                description: '会議名（例：本会議、予算委員会）。半角スペース区切りでOR検索'
              },
              any: {
                type: 'string',
                description: '発言内容の検索キーワード。半角スペース区切りでAND検索'
              },
              speaker: {
                type: 'string',
                description: '発言者名。半角スペース区切りでOR検索'
              },
              from: {
                type: 'string',
                description: '開会日付／始点（YYYY-MM-DD形式）'
              },
              until: {
                type: 'string',
                description: '開会日付／終点（YYYY-MM-DD形式）'
              },
              sessionFrom: {
                type: 'number',
                description: '国会回次From（開始回）'
              },
              sessionTo: {
                type: 'number',
                description: '国会回次To（終了回）'
              },
              issueFrom: {
                type: 'number',
                description: '号数From（開始号）'
              },
              issueTo: {
                type: 'number',
                description: '号数To（終了号）'
              },
              speechNumber: {
                type: 'number',
                description: '発言番号（0以上の整数）'
              },
              speakerPosition: {
                type: 'string',
                description: '発言者肩書き（部分一致）'
              },
              speakerGroup: {
                type: 'string',
                description: '発言者所属会派（部分一致）'
              },
              speakerRole: {
                type: 'string',
                description: '発言者役割（証人、参考人、公述人）',
                enum: ['証人', '参考人', '公述人']
              },
              supplementAndAppendix: {
                type: 'boolean',
                description: '追録・附録に限定（デフォルト：false）'
              },
              contentsAndIndex: {
                type: 'boolean',
                description: '目次・索引に限定（デフォルト：false）'
              },
              searchRange: {
                type: 'string',
                description: '検索対象箇所（冒頭、本文、冒頭・本文）',
                enum: ['冒頭', '本文', '冒頭・本文']
              },
              closing: {
                type: 'boolean',
                description: '閉会中の会議録に限定（デフォルト：false）'
              },
              speechID: {
                type: 'string',
                description: '発言ID（例：100105254X00119470520_000）'
              },
              issueID: {
                type: 'string',
                description: '会議録ID（21桁の英数字）'
              },
              maximumRecords: {
                type: 'number',
                description: '最大取得件数（1-10、デフォルト3）',
                minimum: 1,
                maximum: 10
              },
              startRecord: {
                type: 'number',
                description: '取得開始位置（デフォルト1）',
                minimum: 1
              }
            }
          }
        },
        {
          name: 'search_speeches',
          description: '国会の発言を検索します（発言単位出力）。個別の発言本文を取得します。最大100件まで取得可能。',
          inputSchema: {
            type: 'object',
            properties: {
              nameOfHouse: {
                type: 'string',
                description: '院名（衆議院、参議院、両院、両院協議会）',
                enum: ['衆議院', '参議院', '両院', '両院協議会']
              },
              nameOfMeeting: {
                type: 'string',
                description: '会議名（例：本会議、予算委員会）。半角スペース区切りでOR検索'
              },
              any: {
                type: 'string',
                description: '発言内容の検索キーワード。半角スペース区切りでAND検索'
              },
              speaker: {
                type: 'string',
                description: '発言者名。半角スペース区切りでOR検索'
              },
              from: {
                type: 'string',
                description: '開会日付／始点（YYYY-MM-DD形式）'
              },
              until: {
                type: 'string',
                description: '開会日付／終点（YYYY-MM-DD形式）'
              },
              sessionFrom: {
                type: 'number',
                description: '国会回次From（開始回）'
              },
              sessionTo: {
                type: 'number',
                description: '国会回次To（終了回）'
              },
              issueFrom: {
                type: 'number',
                description: '号数From（開始号）'
              },
              issueTo: {
                type: 'number',
                description: '号数To（終了号）'
              },
              speechNumber: {
                type: 'number',
                description: '発言番号（0以上の整数）'
              },
              speakerPosition: {
                type: 'string',
                description: '発言者肩書き（部分一致）'
              },
              speakerGroup: {
                type: 'string',
                description: '発言者所属会派（部分一致）'
              },
              speakerRole: {
                type: 'string',
                description: '発言者役割（証人、参考人、公述人）',
                enum: ['証人', '参考人', '公述人']
              },
              supplementAndAppendix: {
                type: 'boolean',
                description: '追録・附録に限定（デフォルト：false）'
              },
              contentsAndIndex: {
                type: 'boolean',
                description: '目次・索引に限定（デフォルト：false）'
              },
              searchRange: {
                type: 'string',
                description: '検索対象箇所（冒頭、本文、冒頭・本文）',
                enum: ['冒頭', '本文', '冒頭・本文']
              },
              closing: {
                type: 'boolean',
                description: '閉会中の会議録に限定（デフォルト：false）'
              },
              speechID: {
                type: 'string',
                description: '発言ID（例：100105254X00119470520_000）'
              },
              issueID: {
                type: 'string',
                description: '会議録ID（21桁の英数字）'
              },
              maximumRecords: {
                type: 'number',
                description: '最大取得件数（1-100、デフォルト30）',
                minimum: 1,
                maximum: 100
              },
              startRecord: {
                type: 'number',
                description: '取得開始位置（デフォルト1）',
                minimum: 1
              }
            }
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_meetings_simple':
          return await this.searchMeetingsSimple(args as SearchParams);
        case 'search_meetings_full':
          return await this.searchMeetingsFull(args as SearchParams);
        case 'search_speeches':
          return await this.searchSpeeches(args as SearchParams);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private buildQueryString(params: SearchParams): string {
    const queryParams = new URLSearchParams();
    
    if (params.startRecord) queryParams.append('startRecord', params.startRecord.toString());
    if (params.maximumRecords) queryParams.append('maximumRecords', params.maximumRecords.toString());
    if (params.nameOfHouse) queryParams.append('nameOfHouse', params.nameOfHouse);
    if (params.nameOfMeeting) queryParams.append('nameOfMeeting', params.nameOfMeeting);
    if (params.any) queryParams.append('any', params.any);
    if (params.speaker) queryParams.append('speaker', params.speaker);
    if (params.from) queryParams.append('from', params.from);
    if (params.until) queryParams.append('until', params.until);
    if (params.supplementAndAppendix !== undefined) queryParams.append('supplementAndAppendix', params.supplementAndAppendix.toString());
    if (params.contentsAndIndex !== undefined) queryParams.append('contentsAndIndex', params.contentsAndIndex.toString());
    if (params.searchRange) queryParams.append('searchRange', params.searchRange);
    if (params.closing !== undefined) queryParams.append('closing', params.closing.toString());
    if (params.speechNumber !== undefined) queryParams.append('speechNumber', params.speechNumber.toString());
    if (params.speakerPosition) queryParams.append('speakerPosition', params.speakerPosition);
    if (params.speakerGroup) queryParams.append('speakerGroup', params.speakerGroup);
    if (params.speakerRole) queryParams.append('speakerRole', params.speakerRole);
    if (params.speechID) queryParams.append('speechID', params.speechID);
    if (params.issueID) queryParams.append('issueID', params.issueID);
    if (params.sessionFrom !== undefined) queryParams.append('sessionFrom', params.sessionFrom.toString());
    if (params.sessionTo !== undefined) queryParams.append('sessionTo', params.sessionTo.toString());
    if (params.issueFrom !== undefined) queryParams.append('issueFrom', params.issueFrom.toString());
    if (params.issueTo !== undefined) queryParams.append('issueTo', params.issueTo.toString());
    
    queryParams.append('recordPacking', params.recordPacking || 'json');
    
    return queryParams.toString();
  }

  private async searchMeetingsSimple(params: SearchParams) {
    try {
      const queryString = this.buildQueryString(params);
      const url = `${this.baseUrl}/meeting_list?${queryString}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      if (data.message) {
        return {
          content: [
            {
              type: 'text',
              text: `エラー: ${data.message}\n${data.details ? data.details.join('\n') : ''}`
            }
          ]
        };
      }
      
      if (!data.meetingRecord || data.meetingRecord.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '検索結果が見つかりませんでした。'
            }
          ]
        };
      }
      
      const meetings = data.meetingRecord as MeetingRecord[];
      const totalRecords = data.numberOfRecords;
      const currentRecords = data.numberOfReturn;
      const nextPosition = data.nextRecordPosition;
      
      let resultText = `検索結果: ${totalRecords}件中 ${currentRecords}件を表示\n`;
      if (nextPosition) {
        resultText += `次の結果を取得するには startRecord=${nextPosition} を指定してください\n`;
      }
      resultText += '\n';
      
      meetings.forEach((meeting, index) => {
        resultText += `【${index + 1}】${meeting.nameOfHouse} ${meeting.nameOfMeeting} 第${meeting.issue}号\n`;
        resultText += `日付: ${meeting.date}${meeting.closing ? '（閉会中）' : ''}\n`;
        resultText += `回次: 第${meeting.session}回国会\n`;
        resultText += `会議録ID: ${meeting.issueID}\n`;
        resultText += `会議URL: ${meeting.meetingURL}\n`;
        if (meeting.pdfURL) {
          resultText += `PDF: ${meeting.pdfURL}\n`;
        }
        
        if (meeting.speechRecord && meeting.speechRecord.length > 0) {
          resultText += `該当発言:\n`;
          meeting.speechRecord.forEach(speech => {
            resultText += `  - [${speech.speechOrder}] ${speech.speaker}\n`;
          });
        }
        
        resultText += `---\n`;
      });
      
      return {
        content: [
          {
            type: 'text',
            text: resultText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
          }
        ]
      };
    }
  }

  private async searchMeetingsFull(params: SearchParams) {
    try {
      const queryString = this.buildQueryString(params);
      const url = `${this.baseUrl}/meeting?${queryString}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      if (data.message) {
        return {
          content: [
            {
              type: 'text',
              text: `エラー: ${data.message}\n${data.details ? data.details.join('\n') : ''}`
            }
          ]
        };
      }
      
      if (!data.meetingRecord || data.meetingRecord.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '検索結果が見つかりませんでした。'
            }
          ]
        };
      }
      
      const meetings = data.meetingRecord as MeetingRecord[];
      const totalRecords = data.numberOfRecords;
      const currentRecords = data.numberOfReturn;
      const nextPosition = data.nextRecordPosition;
      
      let resultText = `検索結果: ${totalRecords}件中 ${currentRecords}件を表示\n`;
      if (nextPosition) {
        resultText += `次の結果を取得するには startRecord=${nextPosition} を指定してください\n`;
      }
      resultText += '\n';
      
      meetings.forEach((meeting, index) => {
        resultText += `【${index + 1}】${meeting.nameOfHouse} ${meeting.nameOfMeeting} 第${meeting.issue}号\n`;
        resultText += `日付: ${meeting.date}${meeting.closing ? '（閉会中）' : ''}\n`;
        resultText += `回次: 第${meeting.session}回国会\n`;
        resultText += `会議録ID: ${meeting.issueID}\n`;
        resultText += `会議URL: ${meeting.meetingURL}\n`;
        if (meeting.pdfURL) {
          resultText += `PDF: ${meeting.pdfURL}\n`;
        }
        resultText += '\n';
        
        if (meeting.speechRecord && meeting.speechRecord.length > 0) {
          resultText += `【発言記録】\n`;
          (meeting.speechRecord as SpeechRecordFull[]).forEach(speech => {
            resultText += `\n[${speech.speechOrder}] ${speech.speaker}`;
            if (speech.speakerPosition) resultText += `（${speech.speakerPosition}）`;
            if (speech.speakerGroup) resultText += `［${speech.speakerGroup}］`;
            if (speech.speakerRole) resultText += `《${speech.speakerRole}》`;
            resultText += '\n';
            
            if (speech.speech) {
              const truncated = speech.speech.length > 500 
                ? speech.speech.substring(0, 500) + '...[省略]' 
                : speech.speech;
              resultText += `${truncated}\n`;
            }
            resultText += `発言URL: ${speech.speechURL}\n`;
            resultText += '－－－\n';
          });
        }
        
        resultText += `===\n\n`;
      });
      
      return {
        content: [
          {
            type: 'text',
            text: resultText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
          }
        ]
      };
    }
  }

  private async searchSpeeches(params: SearchParams) {
    try {
      const queryString = this.buildQueryString(params);
      const url = `${this.baseUrl}/speech?${queryString}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      if (data.message) {
        return {
          content: [
            {
              type: 'text',
              text: `エラー: ${data.message}\n${data.details ? data.details.join('\n') : ''}`
            }
          ]
        };
      }
      
      if (!data.speechRecord || data.speechRecord.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '検索結果が見つかりませんでした。'
            }
          ]
        };
      }
      
      const speeches = data.speechRecord as SpeechRecordDetail[];
      const totalRecords = data.numberOfRecords;
      const currentRecords = data.numberOfReturn;
      const nextPosition = data.nextRecordPosition;
      
      let resultText = `検索結果: ${totalRecords}件中 ${currentRecords}件を表示\n`;
      if (nextPosition) {
        resultText += `次の結果を取得するには startRecord=${nextPosition} を指定してください\n`;
      }
      resultText += '\n';
      
      speeches.forEach((speech, index) => {
        resultText += `【${index + 1}】${speech.speaker}`;
        if (speech.speakerPosition) resultText += `（${speech.speakerPosition}）`;
        if (speech.speakerGroup) resultText += `［${speech.speakerGroup}］`;
        if (speech.speakerRole) resultText += `《${speech.speakerRole}》`;
        resultText += '\n';
        
        resultText += `${speech.nameOfHouse} ${speech.nameOfMeeting} 第${speech.issue}号\n`;
        resultText += `日付: ${speech.date}${speech.closing ? '（閉会中）' : ''} 発言番号: ${speech.speechOrder}\n`;
        resultText += `回次: 第${speech.session}回国会\n`;
        
        resultText += `\n発言内容:\n`;
        const truncated = speech.speech.length > 500 
          ? speech.speech.substring(0, 500) + '...[省略]' 
          : speech.speech;
        resultText += `${truncated}\n\n`;
        
        resultText += `発言ID: ${speech.speechID}\n`;
        resultText += `会議録ID: ${speech.issueID}\n`;
        resultText += `発言URL: ${speech.speechURL}\n`;
        resultText += `会議URL: ${speech.meetingURL}\n`;
        if (speech.pdfURL) {
          resultText += `PDF: ${speech.pdfURL}\n`;
        }
        resultText += `---\n`;
      });
      
      return {
        content: [
          {
            type: 'text',
            text: resultText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
          }
        ]
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Kokkai Giji MCP server running on stdio');
  }
}

const server = new KokkaiGijiServer();
server.run().catch(console.error);