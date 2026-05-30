const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  sql?: string;
  data?: Record<string, unknown>[];
  echarts_config?: Record<string, unknown>;
  error?: string;
  execution_time?: number;
  retry_count?: number;
}

export interface TableInfo {
  name: string;
  columns: string[];
}

export interface SchemaResponse {
  tables: TableInfo[];
  description?: string;
}

export interface ChatRequest {
  message: string;
  context: QueryResponse;
}

export interface ChatResponse {
  response: string;
  error?: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP error! status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>('/api/query', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getTables(): Promise<TableInfo[]> {
    return this.request<TableInfo[]>('/api/tables');
  }

  async getSchema(): Promise<SchemaResponse> {
    return this.request<SchemaResponse>('/api/schema');
  }

  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>('/health');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;