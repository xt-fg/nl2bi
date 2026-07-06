const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const AUTH_TOKEN_KEY = 'nl2bi_auth_token';

export interface LoginResponse {
  token: string;
  username: string;
  role: 'admin' | 'analyst' | string;
}

export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  query_id?: number;
  sql?: string;
  data?: Record<string, unknown>[];
  echarts_config?: Record<string, unknown>;
  insight_summary?: string;
  error?: string;
  error_detail?: string;
  suggestions?: string[];
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

export interface SqlExecuteRequest {
  sql: string;
}

export interface SqlExecuteResponse {
  sql: string;
  data?: Record<string, unknown>[];
  echarts_config?: Record<string, unknown>;
  insight_summary?: string;
  error?: string;
  execution_time?: number;
}

export interface DataSourceInfo {
  id: number;
  name: string;
  kind: string;
  connection_label: string;
  status: string;
  table_count: number;
  row_count: number;
  created_at: string;
  updated_at: string;
}

export interface DataSourceTestResponse {
  ok: boolean;
  message: string;
}

export interface DataSourceCreateRequest {
  name: string;
  kind?: string;
  database_url: string;
  activate?: boolean;
}

export interface SemanticField {
  id: number;
  table_name: string;
  column_name: string;
  display_name: string;
  field_type: 'metric' | 'dimension' | 'attribute';
  description: string;
  is_queryable: boolean;
  updated_at: string;
}

export interface SemanticFieldUpdateRequest {
  display_name: string;
  field_type: 'metric' | 'dimension' | 'attribute';
  description: string;
  is_queryable: boolean;
}

export interface QueryRecord {
  id: number;
  query: string;
  sql?: string;
  status: string;
  row_count: number;
  execution_time?: number;
  retry_count: number;
  error?: string;
  insight_summary?: string;
  created_at: string;
}

export interface ReportCreateRequest {
  name: string;
  description?: string;
  query: string;
  sql?: string;
  data: Record<string, unknown>[];
  echarts_config?: Record<string, unknown>;
  insight_summary?: string;
}

export interface ReportSummary {
  id: number;
  name: string;
  description?: string;
  query: string;
  sql?: string;
  insight_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportDetail extends ReportSummary {
  data: Record<string, unknown>[];
  echarts_config?: Record<string, unknown>;
}

class ApiService {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem(AUTH_TOKEN_KEY);
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      defaultHeaders.Authorization = `Bearer ${this.token}`;
    }

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

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setToken(response.token);
    return response;
  }

  async me(): Promise<Omit<LoginResponse, 'token'>> {
    return this.request<Omit<LoginResponse, 'token'>>('/api/auth/me');
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

  async executeSql(request: SqlExecuteRequest): Promise<SqlExecuteResponse> {
    return this.request<SqlExecuteResponse>('/api/execute-sql', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDataSources(): Promise<DataSourceInfo[]> {
    return this.request<DataSourceInfo[]>('/api/data-sources');
  }

  async testDataSource(database_url: string): Promise<DataSourceTestResponse> {
    return this.request<DataSourceTestResponse>('/api/data-sources/test', {
      method: 'POST',
      body: JSON.stringify({ database_url }),
    });
  }

  async createDataSource(request: DataSourceCreateRequest): Promise<DataSourceInfo> {
    return this.request<DataSourceInfo>('/api/data-sources', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSemanticLayer(): Promise<SemanticField[]> {
    return this.request<SemanticField[]>('/api/semantic-layer');
  }

  async updateSemanticField(
    tableName: string,
    columnName: string,
    request: SemanticFieldUpdateRequest,
  ): Promise<SemanticField> {
    return this.request<SemanticField>(`/api/semantic-layer/${tableName}/${columnName}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async getQueryHistory(limit = 50): Promise<QueryRecord[]> {
    return this.request<QueryRecord[]>(`/api/query-history?limit=${limit}`);
  }

  async getReports(): Promise<ReportSummary[]> {
    return this.request<ReportSummary[]>('/api/reports');
  }

  async getReport(id: number): Promise<ReportDetail> {
    return this.request<ReportDetail>(`/api/reports/${id}`);
  }

  async saveReport(request: ReportCreateRequest): Promise<ReportDetail> {
    return this.request<ReportDetail>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;
