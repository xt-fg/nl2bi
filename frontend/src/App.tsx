import React, { useState, useCallback, useEffect } from 'react';
import QueryInput from './components/QueryInput';
import QueryHistory from './components/QueryHistory';
import type { HistoryItem } from './components/QueryHistory';
import ResultDisplay from './components/ResultDisplay';
import ChatPanel from './components/ChatPanel';
import ProductContextPanel from './components/ProductContextPanel';
import LoginScreen from './components/LoginScreen';
import apiService from './services/api';
import type {
  DataSourceInfo,
  QueryResponse,
  ReportSummary,
  SemanticField,
  SqlExecuteResponse,
} from './services/api';

const App: React.FC = () => {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [semanticFields, setSemanticFields] = useState<SemanticField[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);

  const refreshWorkspace = useCallback(async () => {
    const [sources, fields, reportList, records] = await Promise.all([
      apiService.getDataSources(),
      apiService.getSemanticLayer(),
      apiService.getReports(),
      apiService.getQueryHistory(20),
    ]);
    setDataSources(sources);
    setSemanticFields(fields);
    setReports(reportList);
    setHistory(records.map((record) => ({
      id: String(record.id),
      query: record.query,
      timestamp: new Date(record.created_at),
      hasError: record.status !== 'success',
      rowCount: record.row_count,
    })));
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiService.me()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch(() => {
        apiService.setToken(null);
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    Promise.resolve()
      .then(() => refreshWorkspace())
      .catch((error) => {
        console.error('Failed to load workspace metadata', error);
      })
      .finally(() => {
        if (isMounted) setIsWorkspaceLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [refreshWorkspace, user]);

  const handleQuerySubmit = useCallback(async (query: string) => {
    setIsLoading(true);
    setResult(null);
    setCurrentQuery(query);

    try {
      const response = await apiService.query({ query });
      setResult(response);

      // 添加到历史
      const item: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        hasError: !!response.error,
        rowCount: response.data?.length ?? 0,
      };
      setHistory((prev) => [item, ...prev].slice(0, 20)); // 最多保留20条
      refreshWorkspace().catch((error) => console.error('Failed to refresh workspace', error));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '查询失败，请稍后重试';
      setResult({ error: errorMessage });

      const item: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        hasError: true,
        rowCount: 0,
      };
      setHistory((prev) => [item, ...prev].slice(0, 20));
      refreshWorkspace().catch((error) => console.error('Failed to refresh workspace', error));
    } finally {
      setIsLoading(false);
    }
  }, [refreshWorkspace]);

  const handleChatMessage = useCallback(
    async (message: string, context: QueryResponse): Promise<string> => {
      const response = await apiService.chat({ message, context });
      if (response.error) throw new Error(response.error);
      return response.response;
    },
    [],
  );

  const handleSqlRerun = useCallback((response: SqlExecuteResponse) => {
    // 将 SQL 执行结果转换为 QueryResponse 格式
    const queryResponse: QueryResponse = {
      sql: response.sql,
      data: response.data,
      echarts_config: response.echarts_config,
      insight_summary: response.insight_summary,
      error: response.error,
      execution_time: response.execution_time,
    };
    setResult(queryResponse);
  }, []);

  const handleSaveReport = useCallback(
    async (name: string, description?: string) => {
      if (!result?.data || result.data.length === 0) {
        throw new Error('当前没有可保存的数据结果');
      }
      await apiService.saveReport({
        name,
        description,
        query: currentQuery || '手动 SQL 查询',
        sql: result.sql,
        data: result.data,
        echarts_config: result.echarts_config,
        insight_summary: result.insight_summary,
      });
      const reportList = await apiService.getReports();
      setReports(reportList);
    },
    [currentQuery, result],
  );

  const handleOpenReport = useCallback(async (id: number) => {
    const report = await apiService.getReport(id);
    setCurrentQuery(report.query);
    setResult({
      sql: report.sql,
      data: report.data,
      echarts_config: report.echarts_config,
      insight_summary: report.insight_summary,
      execution_time: 0,
      retry_count: 0,
    });
  }, []);

  const handleTestDataSource = useCallback(async (databaseUrl: string) => {
    const response = await apiService.testDataSource(databaseUrl);
    if (!response.ok) {
      throw new Error(response.message);
    }
    return response.message;
  }, []);

  const handleCreateDataSource = useCallback(
    async (name: string, databaseUrl: string) => {
      await apiService.createDataSource({
        name,
        kind: databaseUrl.split(':', 1)[0] || 'sqlalchemy',
        database_url: databaseUrl,
        activate: true,
      });
      await refreshWorkspace();
      setHistory([]);
      setResult(null);
      setCurrentQuery('');
    },
    [refreshWorkspace],
  );

  const handleUpdateSemanticField = useCallback(async (field: SemanticField) => {
    await apiService.updateSemanticField(field.table_name, field.column_name, {
      display_name: field.display_name,
      field_type: field.field_type,
      description: field.description,
      is_queryable: field.is_queryable,
    });
    const fields = await apiService.getSemanticLayer();
    setSemanticFields(fields);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    const response = await apiService.login(username, password);
    setUser({ username: response.username, role: response.role });
    setIsWorkspaceLoading(true);
  }, []);

  const handleLogout = useCallback(() => {
    apiService.setToken(null);
    setUser(null);
    setResult(null);
    setHistory([]);
    setReports([]);
    setDataSources([]);
    setSemanticFields([]);
    setCurrentQuery('');
  }, []);

  const totalRows = history.reduce((sum, item) => sum + item.rowCount, 0);

  if (isAuthLoading) {
    return (
      <div className="workspace-bg flex min-h-screen items-center justify-center">
        <p className="text-sm font-bold text-slate-500">正在恢复登录状态</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="workspace-bg">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
              BI
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-normal text-slate-950">NL2BI</h1>
              <p className="truncate text-xs font-medium text-slate-500">自然语言数据分析工作台</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-800">{user.username}</p>
              <p className="text-xs font-semibold text-slate-500">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="card-surface rounded-lg px-4 py-3">
            <p className="panel-eyebrow">Session</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{history.length}</p>
            <p className="text-xs font-medium text-slate-500">本次查询</p>
          </div>
          <div className="card-surface rounded-lg px-4 py-3">
            <p className="panel-eyebrow">Rows</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{totalRows}</p>
            <p className="text-xs font-medium text-slate-500">已返回数据行</p>
          </div>
          <div className="card-surface rounded-lg px-4 py-3">
            <p className="panel-eyebrow">State</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{isLoading ? '运行中' : '待命'}</p>
            <p className="text-xs font-medium text-slate-500">分析任务状态</p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="space-y-6 lg:col-span-4 xl:col-span-3">
            <QueryInput onSubmit={handleQuerySubmit} isLoading={isLoading} />
            <QueryHistory
              history={history}
              onSelect={handleQuerySubmit}
              onClear={() => setHistory([])}
            />
            <ProductContextPanel
              dataSources={dataSources}
              semanticFields={semanticFields}
              reports={reports}
              onOpenReport={handleOpenReport}
              onTestDataSource={handleTestDataSource}
              onCreateDataSource={handleCreateDataSource}
              onUpdateSemanticField={handleUpdateSemanticField}
              canManageDataSources={user.role === 'admin'}
              isLoading={isWorkspaceLoading}
            />
          </aside>

          <section className="space-y-6 lg:col-span-8 xl:col-span-9">
            <ResultDisplay
              result={result}
              isLoading={isLoading}
              onSqlRerun={handleSqlRerun}
              onSaveReport={handleSaveReport}
            />
            <ChatPanel queryResult={result} onSendMessage={handleChatMessage} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
