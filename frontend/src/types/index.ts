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

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface ChatRequest {
  message: string;
  context: QueryResponse;
}

export interface ChatResponse {
  response: string;
  error?: string;
}
