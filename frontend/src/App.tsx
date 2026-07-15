import React, { useCallback, useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import type { PageKey } from './components/AppShell';
import ChatPanel from './components/ChatPanel';
import DataAssetsPage from './components/DataAssetsPage';
import LoginScreen from './components/LoginScreen';
import QueryHistory from './components/QueryHistory';
import type { HistoryItem } from './components/QueryHistory';
import QueryInput from './components/QueryInput';
import QueryRecordsPage from './components/QueryRecordsPage';
import ReportsPage from './components/ReportsPage';
import ResultDisplay from './components/ResultDisplay';
import SettingsPage from './components/SettingsPage';
import apiService from './services/api';
import type {
  DataSourceInfo,
  QueryRecord,
  QueryResponse,
  ReportSummary,
  SemanticField,
  SqlExecuteResponse,
} from './services/api';

const pageKeys: PageKey[] = ['analysis', 'reports', 'data-assets', 'query-records', 'settings'];

const pageFromLocation = (): PageKey => {
  const value = window.location.hash.replace('#', '') as PageKey;
  return pageKeys.includes(value) ? value : 'analysis';
};

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageKey>(pageFromLocation);
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [queryRecords, setQueryRecords] = useState<QueryRecord[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [semanticFields, setSemanticFields] = useState<SemanticField[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);

  const navigateTo = useCallback((page: PageKey) => {
    setActivePage(page);
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const syncPage = () => setActivePage(pageFromLocation());
    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    const [sources, fields, reportList, records] = await Promise.all([
      apiService.getDataSources(),
      apiService.getSemanticLayer(),
      apiService.getReports(),
      apiService.getQueryHistory(100),
    ]);
    setDataSources(sources);
    setSemanticFields(fields);
    setReports(reportList);
    setQueryRecords(records);
    setHistory(records.slice(0, 20).map((record) => ({
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
    Promise.all([
      apiService.getDataSources(),
      apiService.getSemanticLayer(),
      apiService.getReports(),
      apiService.getQueryHistory(100),
    ])
      .then(([sources, fields, reportList, records]) => {
        if (!isMounted) return;
        setDataSources(sources);
        setSemanticFields(fields);
        setReports(reportList);
        setQueryRecords(records);
        setHistory(records.slice(0, 20).map((record) => ({
          id: String(record.id),
          query: record.query,
          timestamp: new Date(record.created_at),
          hasError: record.status !== 'success',
          rowCount: record.row_count,
        })));
      })
      .catch((error) => {
        console.error('Failed to load workspace metadata', error);
      })
      .finally(() => {
        if (isMounted) setIsWorkspaceLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleQuerySubmit = useCallback(async (query: string) => {
    setIsLoading(true);
    setResult(null);
    setCurrentQuery(query);

    try {
      const response = await apiService.query({ query });
      setResult(response);
      const item: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        hasError: !!response.error,
        rowCount: response.data?.length ?? 0,
      };
      setHistory((previous) => [item, ...previous].slice(0, 20));
      refreshWorkspace().catch((error) => console.error('Failed to refresh workspace', error));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '查询失败，请稍后重试';
      setResult({ error: errorMessage });
      const item: HistoryItem = {
        id: Date.now().toString(),
        query,
        timestamp: new Date(),
        hasError: true,
        rowCount: 0,
      };
      setHistory((previous) => [item, ...previous].slice(0, 20));
      refreshWorkspace().catch((refreshError) => console.error('Failed to refresh workspace', refreshError));
    } finally {
      setIsLoading(false);
    }
  }, [refreshWorkspace]);

  const handleRunFromRecord = useCallback((query: string) => {
    navigateTo('analysis');
    void handleQuerySubmit(query);
  }, [handleQuerySubmit, navigateTo]);

  const handleChatMessage = useCallback(async (message: string, context: QueryResponse): Promise<string> => {
    const response = await apiService.chat({ message, context });
    if (response.error) throw new Error(response.error);
    return response.response;
  }, []);

  const handleSqlRerun = useCallback((response: SqlExecuteResponse) => {
    setResult({
      sql: response.sql,
      data: response.data,
      echarts_config: response.echarts_config,
      insight_summary: response.insight_summary,
      error: response.error,
      execution_time: response.execution_time,
    });
  }, []);

  const handleSaveReport = useCallback(async (name: string, description?: string) => {
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
    setReports(await apiService.getReports());
  }, [currentQuery, result]);

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
    navigateTo('analysis');
  }, [navigateTo]);

  const handleTestDataSource = useCallback(async (databaseUrl: string) => {
    const response = await apiService.testDataSource(databaseUrl);
    if (!response.ok) throw new Error(response.message);
    return response.message;
  }, []);

  const handleCreateDataSource = useCallback(async (name: string, databaseUrl: string) => {
    await apiService.createDataSource({
      name,
      kind: databaseUrl.split(':', 1)[0] || 'sqlalchemy',
      database_url: databaseUrl,
      activate: true,
    });
    await refreshWorkspace();
    setResult(null);
    setCurrentQuery('');
  }, [refreshWorkspace]);

  const handleUpdateSemanticField = useCallback(async (field: SemanticField) => {
    await apiService.updateSemanticField(field.table_name, field.column_name, {
      display_name: field.display_name,
      field_type: field.field_type,
      description: field.description,
      is_queryable: field.is_queryable,
    });
    setSemanticFields(await apiService.getSemanticLayer());
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    setIsWorkspaceLoading(true);
    const response = await apiService.login(username, password);
    setUser({ username: response.username, role: response.role });
  }, []);

  const handleLogout = useCallback(() => {
    apiService.setToken(null);
    setUser(null);
    setResult(null);
    setHistory([]);
    setQueryRecords([]);
    setReports([]);
    setDataSources([]);
    setSemanticFields([]);
    setCurrentQuery('');
    navigateTo('analysis');
  }, [navigateTo]);

  if (isAuthLoading) {
    return (
      <div className="workspace-bg flex min-h-screen items-center justify-center">
        <p className="text-sm font-bold text-slate-500">正在恢复登录状态</p>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const activeSource = dataSources.find((source) => source.status === 'active') ?? dataSources[0];

  return (
    <AppShell
      activePage={activePage}
      username={user.username}
      role={user.role}
      onNavigate={navigateTo}
      onLogout={handleLogout}
    >
      {activePage === 'analysis' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <aside className="space-y-6 xl:col-span-4 2xl:col-span-3">
            <QueryInput onSubmit={handleQuerySubmit} isLoading={isLoading} />
            <section className="card-surface rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="panel-eyebrow">Data source</p>
                  <h2 className="panel-title mt-1 truncate">{activeSource?.name ?? '尚未配置数据源'}</h2>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">{activeSource?.connection_label ?? '请先在数据资产中完成配置'}</p>
                </div>
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${activeSource?.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              </div>
              <button onClick={() => navigateTo('data-assets')} className="mt-4 text-xs font-bold text-blue-700 transition hover:text-blue-800">
                查看数据资产 →
              </button>
            </section>
            <QueryHistory history={history.slice(0, 8)} onSelect={handleQuerySubmit} onClear={() => setHistory([])} />
          </aside>

          <section className="space-y-6 xl:col-span-8 2xl:col-span-9">
            <ResultDisplay result={result} isLoading={isLoading} onSqlRerun={handleSqlRerun} onSaveReport={handleSaveReport} />
            <ChatPanel queryResult={result} onSendMessage={handleChatMessage} />
          </section>
        </div>
      )}

      {activePage === 'reports' && (
        <ReportsPage reports={reports} isLoading={isWorkspaceLoading} onOpenReport={handleOpenReport} onStartAnalysis={() => navigateTo('analysis')} />
      )}

      {activePage === 'data-assets' && (
        <DataAssetsPage
          dataSources={dataSources}
          semanticFields={semanticFields}
          canManage={user.role === 'admin'}
          isLoading={isWorkspaceLoading}
          onTestDataSource={handleTestDataSource}
          onCreateDataSource={handleCreateDataSource}
          onUpdateSemanticField={handleUpdateSemanticField}
        />
      )}

      {activePage === 'query-records' && (
        <QueryRecordsPage records={queryRecords} isLoading={isWorkspaceLoading} onRunAgain={handleRunFromRecord} />
      )}

      {activePage === 'settings' && (
        <SettingsPage username={user.username} role={user.role} activeSource={activeSource} onNavigate={navigateTo} />
      )}
    </AppShell>
  );
};

export default App;
