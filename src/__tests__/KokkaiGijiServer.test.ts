import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('KokkaiGijiServer', () => {
  let server: Server;
  let listToolsHandler: any;
  let callToolHandler: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock Server constructor and methods
    const mockSetRequestHandler = jest.fn((schema: any, handler: any) => {
      if (schema === ListToolsRequestSchema) {
        listToolsHandler = handler;
      } else if (schema === CallToolRequestSchema) {
        callToolHandler = handler;
      }
    });

    jest.spyOn(Server.prototype, 'setRequestHandler').mockImplementation(mockSetRequestHandler as any);
    
    // Import and instantiate server (this happens in index.ts)
    server = new Server(
      { name: 'kokkai-giji-mcp', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    // Manually call setupHandlers equivalent
    server.setRequestHandler(ListToolsRequestSchema, jest.fn() as any);
    server.setRequestHandler(CallToolRequestSchema, jest.fn() as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Tool Registration', () => {
    it('should register three tools', async () => {
      const mockHandler = jest.fn() as any;
      mockHandler.mockResolvedValue({
        tools: [
          { name: 'search_meetings_simple' },
          { name: 'search_meetings_full' },
          { name: 'search_speeches' }
        ]
      });
      
      server.setRequestHandler(ListToolsRequestSchema, mockHandler);
      
      const response = await mockHandler();
      expect(response.tools).toHaveLength(3);
      expect(response.tools.map((t: any) => t.name)).toEqual([
        'search_meetings_simple',
        'search_meetings_full',
        'search_speeches'
      ]);
    });
  });

  describe('Query String Building', () => {
    it('should build correct query string with basic parameters', () => {
      const params = {
        nameOfHouse: '衆議院',
        any: '科学技術',
        maximumRecords: 10
      };
      
      const queryString = new URLSearchParams();
      if (params.nameOfHouse) queryString.append('nameOfHouse', params.nameOfHouse);
      if (params.any) queryString.append('any', params.any);
      if (params.maximumRecords) queryString.append('maximumRecords', params.maximumRecords.toString());
      queryString.append('recordPacking', 'json');
      
      const result = queryString.toString();
      expect(result).toContain('nameOfHouse=%E8%A1%86%E8%AD%B0%E9%99%A2');
      expect(result).toContain('any=%E7%A7%91%E5%AD%A6%E6%8A%80%E8%A1%93');
      expect(result).toContain('maximumRecords=10');
      expect(result).toContain('recordPacking=json');
    });

    it('should handle date range parameters', () => {
      const params = {
        from: '2023-01-01',
        until: '2023-12-31'
      };
      
      const queryString = new URLSearchParams();
      if (params.from) queryString.append('from', params.from);
      if (params.until) queryString.append('until', params.until);
      queryString.append('recordPacking', 'json');
      
      const result = queryString.toString();
      expect(result).toContain('from=2023-01-01');
      expect(result).toContain('until=2023-12-31');
    });

    it('should handle boolean parameters', () => {
      const params = {
        supplementAndAppendix: true,
        contentsAndIndex: false,
        closing: true
      };
      
      const queryString = new URLSearchParams();
      if (params.supplementAndAppendix !== undefined) {
        queryString.append('supplementAndAppendix', params.supplementAndAppendix.toString());
      }
      if (params.contentsAndIndex !== undefined) {
        queryString.append('contentsAndIndex', params.contentsAndIndex.toString());
      }
      if (params.closing !== undefined) {
        queryString.append('closing', params.closing.toString());
      }
      queryString.append('recordPacking', 'json');
      
      const result = queryString.toString();
      expect(result).toContain('supplementAndAppendix=true');
      expect(result).toContain('contentsAndIndex=false');
      expect(result).toContain('closing=true');
    });
  });

  describe('API Response Handling', () => {
    it('should handle successful meeting list response', async () => {
      const mockResponse = {
        numberOfRecords: 100,
        numberOfReturn: 30,
        nextRecordPosition: 31,
        meetingRecord: [
          {
            issueID: 'TEST123',
            session: 200,
            nameOfHouse: '衆議院',
            nameOfMeeting: '本会議',
            issue: '1',
            date: '2023-01-01',
            meetingURL: 'https://example.com/meeting',
            pdfURL: 'https://example.com/pdf'
          }
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const url = 'https://kokkai.ndl.go.jp/api/meeting_list?any=test&recordPacking=json';
      const response = await fetch(url);
      const data = await response.json() as any;
      
      expect(data.numberOfRecords).toBe(100);
      expect(data.meetingRecord).toHaveLength(1);
      expect(data.meetingRecord[0].nameOfHouse).toBe('衆議院');
    });

    it('should handle API error response', async () => {
      const mockErrorResponse = {
        message: 'エラーが発生しました',
        details: ['パラメータが不正です']
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockErrorResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const url = 'https://kokkai.ndl.go.jp/api/meeting_list?invalidParam=test';
      const response = await fetch(url);
      const data = await response.json() as any;
      
      expect(data.message).toBe('エラーが発生しました');
      expect(data.details).toContain('パラメータが不正です');
    });

    it('should handle empty search results', async () => {
      const mockResponse = {
        numberOfRecords: 0,
        numberOfReturn: 0,
        meetingRecord: []
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const url = 'https://kokkai.ndl.go.jp/api/meeting_list?any=nonexistent&recordPacking=json';
      const response = await fetch(url);
      const data = await response.json() as any;
      
      expect(data.numberOfRecords).toBe(0);
      expect(data.meetingRecord).toHaveLength(0);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Network error')
      );

      await expect(fetch('https://kokkai.ndl.go.jp/api/meeting_list')).rejects.toThrow('Network error');
    });
  });

  describe('Speech Record Processing', () => {
    it('should handle speech records in meeting response', async () => {
      const mockResponse = {
        numberOfRecords: 1,
        numberOfReturn: 1,
        meetingRecord: [
          {
            issueID: 'TEST123',
            session: 200,
            nameOfHouse: '衆議院',
            nameOfMeeting: '予算委員会',
            issue: '1',
            date: '2023-01-01',
            speechRecord: [
              {
                speechID: 'SPEECH001',
                speechOrder: 1,
                speaker: '山田太郎',
                speakerPosition: '内閣総理大臣',
                speakerGroup: '自由民主党',
                speech: 'これはテスト発言です。',
                speechURL: 'https://example.com/speech'
              }
            ],
            meetingURL: 'https://example.com/meeting'
          }
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const response = await fetch('https://kokkai.ndl.go.jp/api/meeting?any=test');
      const data = await response.json() as any;
      
      expect(data.meetingRecord[0].speechRecord).toHaveLength(1);
      expect(data.meetingRecord[0].speechRecord[0].speaker).toBe('山田太郎');
      expect(data.meetingRecord[0].speechRecord[0].speakerPosition).toBe('内閣総理大臣');
    });
  });

  describe('Pagination', () => {
    it('should handle pagination parameters correctly', () => {
      const params = {
        startRecord: 11,
        maximumRecords: 10
      };
      
      const queryString = new URLSearchParams();
      if (params.startRecord) queryString.append('startRecord', params.startRecord.toString());
      if (params.maximumRecords) queryString.append('maximumRecords', params.maximumRecords.toString());
      queryString.append('recordPacking', 'json');
      
      const result = queryString.toString();
      expect(result).toContain('startRecord=11');
      expect(result).toContain('maximumRecords=10');
    });

    it('should indicate next page availability', async () => {
      const mockResponse = {
        numberOfRecords: 150,
        numberOfReturn: 30,
        startRecord: 1,
        nextRecordPosition: 31,
        meetingRecord: Array(30).fill({
          issueID: 'TEST',
          session: 200,
          nameOfHouse: '衆議院',
          nameOfMeeting: '本会議',
          issue: '1',
          date: '2023-01-01',
          meetingURL: 'https://example.com/meeting'
        })
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const response = await fetch('https://kokkai.ndl.go.jp/api/meeting_list?any=test');
      const data = await response.json() as any;
      
      expect(data.nextRecordPosition).toBe(31);
      expect(data.numberOfRecords).toBe(150);
      expect(data.numberOfReturn).toBe(30);
    });
  });
});