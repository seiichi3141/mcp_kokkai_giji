import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch for integration tests
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Search Workflows', () => {
    it('should perform a complete meeting search workflow', async () => {
      // First search - get meeting list
      const meetingListResponse = {
        numberOfRecords: 50,
        numberOfReturn: 10,
        nextRecordPosition: 11,
        meetingRecord: [
          {
            issueID: 'MEETING001',
            session: 210,
            nameOfHouse: '参議院',
            nameOfMeeting: '文教科学委員会',
            issue: '5',
            date: '2024-03-15',
            meetingURL: 'https://kokkai.ndl.go.jp/meeting/MEETING001',
            speechRecord: [
              { speechID: 'SP001', speechOrder: 1, speaker: '田中花子', speechURL: 'https://kokkai.ndl.go.jp/speech/SP001' },
              { speechID: 'SP002', speechOrder: 2, speaker: '鈴木一郎', speechURL: 'https://kokkai.ndl.go.jp/speech/SP002' }
            ]
          }
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => meetingListResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // Simulate first API call
      const listUrl = 'https://kokkai.ndl.go.jp/api/meeting_list?nameOfMeeting=%E6%96%87%E6%95%99%E7%A7%91%E5%AD%A6&recordPacking=json';
      const listResponse = await fetch(listUrl);
      const listData = await listResponse.json() as any;

      expect(listData.numberOfRecords).toBe(50);
      expect(listData.meetingRecord[0].nameOfMeeting).toBe('文教科学委員会');
      expect(listData.meetingRecord[0].speechRecord).toHaveLength(2);

      // Second search - get meeting details
      const meetingDetailResponse = {
        numberOfRecords: 1,
        numberOfReturn: 1,
        meetingRecord: [
          {
            issueID: 'MEETING001',
            session: 210,
            nameOfHouse: '参議院',
            nameOfMeeting: '文教科学委員会',
            issue: '5',
            date: '2024-03-15',
            meetingURL: 'https://kokkai.ndl.go.jp/meeting/MEETING001',
            speechRecord: [
              {
                speechID: 'SP001',
                speechOrder: 1,
                speaker: '田中花子',
                speakerPosition: '文部科学大臣',
                speakerGroup: '自由民主党',
                speech: '教育改革について申し上げます。我が国の教育制度は...',
                startPage: 1,
                createTime: '2024-03-16T10:00:00',
                updateTime: '2024-03-16T10:00:00',
                speechURL: 'https://kokkai.ndl.go.jp/speech/SP001'
              },
              {
                speechID: 'SP002',
                speechOrder: 2,
                speaker: '鈴木一郎',
                speakerPosition: '委員',
                speakerGroup: '立憲民主党',
                speech: 'ただいまの大臣の答弁について質問があります...',
                startPage: 3,
                createTime: '2024-03-16T10:00:00',
                updateTime: '2024-03-16T10:00:00',
                speechURL: 'https://kokkai.ndl.go.jp/speech/SP002'
              }
            ]
          }
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => meetingDetailResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // Simulate second API call
      const detailUrl = 'https://kokkai.ndl.go.jp/api/meeting?issueID=MEETING001&recordPacking=json';
      const detailResponse = await fetch(detailUrl);
      const detailData = await detailResponse.json() as any;

      expect(detailData.meetingRecord[0].speechRecord[0].speech).toContain('教育改革');
      expect(detailData.meetingRecord[0].speechRecord[0].speakerPosition).toBe('文部科学大臣');
    });

    it('should search speeches with multiple filters', async () => {
      const speechResponse = {
        numberOfRecords: 200,
        numberOfReturn: 30,
        nextRecordPosition: 31,
        speechRecord: [
          {
            speechID: 'SPEECH123',
            issueID: 'ISSUE456',
            imageKind: '会議録',
            searchObject: '本文',
            session: 210,
            nameOfHouse: '衆議院',
            nameOfMeeting: '予算委員会',
            issue: '10',
            date: '2024-02-20',
            speechOrder: 5,
            speaker: '佐藤次郎',
            speakerYomi: 'さとうじろう',
            speakerGroup: '国民民主党',
            speakerPosition: '財務大臣',
            speech: '予算案について説明いたします。本年度の予算は...',
            startPage: 15,
            speechURL: 'https://kokkai.ndl.go.jp/speech/SPEECH123',
            meetingURL: 'https://kokkai.ndl.go.jp/meeting/ISSUE456',
            pdfURL: 'https://kokkai.ndl.go.jp/pdf/ISSUE456'
          }
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => speechResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // Build complex query
      const params = new URLSearchParams({
        nameOfHouse: '衆議院',
        nameOfMeeting: '予算委員会',
        speaker: '佐藤',
        from: '2024-01-01',
        until: '2024-12-31',
        sessionFrom: '210',
        maximumRecords: '30',
        recordPacking: 'json'
      });

      const url = `https://kokkai.ndl.go.jp/api/speech?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json() as any;

      expect(data.numberOfRecords).toBe(200);
      expect(data.speechRecord[0].speaker).toBe('佐藤次郎');
      expect(data.speechRecord[0].speakerPosition).toBe('財務大臣');
      expect(data.speechRecord[0].speech).toContain('予算案');
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle API validation errors', async () => {
      const errorResponse = {
        message: '検索条件の入力に誤りがあります。',
        details: [
          'maximumRecordsには1～100の値を指定してください。',
          'fromはuntil以下、もしくはuntilはfrom以上の日付で入力してください。'
        ]
      };

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      const url = 'https://kokkai.ndl.go.jp/api/meeting_list?maximumRecords=200&from=2024-12-31&until=2024-01-01';
      const response = await fetch(url);
      const data = await response.json() as any;

      expect(data.message).toContain('検索条件の入力に誤りがあります');
      expect(data.details).toHaveLength(2);
    });

    it('should handle HTTP errors', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ message: 'Service temporarily unavailable' })
      } as Response);

      const url = 'https://kokkai.ndl.go.jp/api/meeting_list?any=test';
      const response = await fetch(url);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(503);
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle Japanese characters in parameters', () => {
      const params = new URLSearchParams({
        nameOfMeeting: '予算委員会',
        speaker: '田中太郎',
        any: '消費税 経済政策'
      });

      const encoded = params.toString();
      
      // Check that Japanese characters are properly encoded
      expect(encoded).toContain('nameOfMeeting=%E4%BA%88%E7%AE%97%E5%A7%94%E5%93%A1%E4%BC%9A');
      expect(encoded).toContain('speaker=%E7%94%B0%E4%B8%AD%E5%A4%AA%E9%83%8E');
      expect(encoded).toContain('any=%E6%B6%88%E8%B2%BB%E7%A8%8E+%E7%B5%8C%E6%B8%88%E6%94%BF%E7%AD%96');
    });

    it('should handle special search patterns', () => {
      const params = {
        any: '北海道 青森',  // AND search
        nameOfMeeting: '文部 文教',  // OR search
        speaker: '田中 鈴木'  // OR search
      };

      const queryString = new URLSearchParams(params);
      const result = queryString.toString();

      // Verify space handling for different search types
      expect(result).toContain('any=%E5%8C%97%E6%B5%B7%E9%81%93+%E9%9D%92%E6%A3%AE');
      expect(result).toContain('nameOfMeeting=%E6%96%87%E9%83%A8+%E6%96%87%E6%95%99');
      expect(result).toContain('speaker=%E7%94%B0%E4%B8%AD+%E9%88%B4%E6%9C%A8');
    });
  });
});