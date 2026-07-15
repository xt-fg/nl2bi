import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import type { PageKey } from './components/AppShell';
import ChatPanel from './components/ChatPanel';
import LoginScreen from './components/LoginScreen';
import QueryHistory from './components/QueryHistory';
import QueryInput from './components/QueryInput';
import ResultDisplay from './components/ResultDisplay';
import useWorkspaceData from './hooks/useWorkspaceData';
import apiService from './services/api';
import type {
  QueryResponse,
  SemanticField,
  SqlExecuteResponse,
} from './services/api';

const DataAssetsPage = lazy(() => import('./components/DataAssetsPage'));
const QueryRecordsPage = lazy(() => import('./components/QueryRecordsPage'));
const ReportsPage = lazy(() => import('./components/ReportsPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));

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
  const [currentQuery, setCurrentQuery] = useState('');
  const {
    dataSources,
    semanticFields,
    reports,
    queryRecords,
    history,
    isLoading: isWorkspaceLoading,
    loadError: workspaceLoadError,
    refreshDataSources,
    refreshSemanticFields,
    refreshReports,
    refreshQueryRecords,
    clearWorkspace,
  } = useWorkspaceData(Boolean(user));

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

  const handleQuerySubmit = useCallback(async (query: string) => {
    setIsLoading(true);
    setResult(null);
    setCurrentQuery(query);

    try {
      const response = await apiService.query({ query });
      setResult(response);
      refreshQueryRecords().catch((error) => console.error('Failed to refresh query records', error));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '查询失败，请稍后重试';
      setResult({ error: errorMessage });
      refreshQueryRecords().catch((refreshError) => console.error('Failed to refresh query records', refreshError));
    } finally {
      setIsLoading(false);
    }
  }, [refreshQueryRecords]);

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
    await refreshReports();
  }, [currentQuery, refreshReports, result]);

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
    await Promise.all([
      refreshDataSources(),
      refreshSemanticFields(),
      refreshQueryRecords(),
    ]);
    setResult(null);
    setCurrentQuery('');
  }, [refreshDataSources, refreshQueryRecords, refreshSemanticFields]);

  const handleUpdateSemanticField = useCallback(async (field: SemanticField) => {
    await apiService.updateSemanticField(field.table_name, field.column_name, {
      display_name: field.display_name,
      field_type: field.field_type,
      description: field.description,
      is_queryable: field.is_queryable,
    });
    await refreshSemanticFields();
  }, [refreshSemanticFields]);

  const handleLogin = useCallback(async (username: string, password: string) => {
    const response = await apiService.login(username, password);
    setUser({ username: response.username, role: response.role });
  }, []);

  const handleLogout = useCallback(() => {
    apiService.setToken(null);
    setUser(null);
    setResult(null);
    setCurrentQuery('');
    clearWorkspace();
    navigateTo('analysis');
  }, [clearWorkspace, navigateTo]);

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
      {workspaceLoadError && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          部分工作区数据加载失败：{workspaceLoadError}
        </p>
      )}
      <Suspense fallback={(
        <div className="card-surface rounded-xl px-6 py-16 text-center text-sm font-semibold text-slate-500">
          正在加载页面
        </div>
      )}>
        {activePage === 'analysis' && (
          <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-6">
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
              <QueryHistory history={history.slice(0, 8)} onSelect={handleQuerySubmit} />
            </aside>

            <section className="min-w-0 space-y-6">
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
      </Suspense>
    </AppShell>
  );
};

export default App;
