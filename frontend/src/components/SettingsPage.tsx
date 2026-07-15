import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import type { DataSourceInfo, LlmSettingsStatus } from '../services/api';
import type { PageKey } from './AppShell';

interface SettingsPageProps {
  username: string;
  role: string;
  activeSource?: DataSourceInfo;
  onNavigate: (page: PageKey) => void;
}

const sourceLabels: Record<LlmSettingsStatus['source'], string> = {
  override: '管理员覆盖',
  environment: '.env 默认值',
  missing: '尚未配置',
};

const LlmSettingsCard: React.FC = () => {
  const [settings, setSettings] = useState<LlmSettingsStatus | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<'save-key' | 'reset-key' | 'save-url' | 'reset-url' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;
    apiService.getLlmSettings()
      .then((response) => {
        if (isActive) {
          setSettings(response);
          setBaseUrl(response.base_url);
        }
      })
      .catch((loadError) => {
        if (isActive) setError(loadError instanceof Error ? loadError.message : '加载 LLM 配置失败');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setAction('save-key');
    setMessage('');
    setError('');
    try {
      setSettings(await apiService.updateLlmApiKey(apiKey.trim()));
      setApiKey('');
      setMessage('新的 API Key 已保存，将用于后续 LLM 请求');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存 API Key 失败');
    } finally {
      setAction(null);
    }
  };

  const handleReset = async () => {
    setAction('reset-key');
    setMessage('');
    setError('');
    try {
      setSettings(await apiService.resetLlmApiKey());
      setApiKey('');
      setMessage('已删除管理员覆盖值，恢复使用 .env 配置');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : '恢复默认配置失败');
    } finally {
      setAction(null);
    }
  };

  const handleBaseUrlSave = async () => {
    if (!baseUrl.trim()) return;
    setAction('save-url');
    setMessage('');
    setError('');
    try {
      const response = await apiService.updateLlmBaseUrl(baseUrl.trim());
      setSettings(response);
      setBaseUrl(response.base_url);
      setMessage('新的 Base URL 已保存，将用于后续 LLM 请求');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存 Base URL 失败');
    } finally {
      setAction(null);
    }
  };

  const handleBaseUrlReset = async () => {
    setAction('reset-url');
    setMessage('');
    setError('');
    try {
      const response = await apiService.resetLlmBaseUrl();
      setSettings(response);
      setBaseUrl(response.base_url);
      setMessage('已恢复使用 .env 中的 OPENAI_API_BASE');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : '恢复 Base URL 失败');
    } finally {
      setAction(null);
    }
  };

  return (
    <section className="card-surface rounded-xl p-5 sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="panel-eyebrow">LLM Provider</p>
          <h2 className="panel-title mt-1">LLM 连接配置</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            管理员覆盖值优先生效；未设置时自动使用后端 .env 中的 API Key 和 Base URL。
          </p>
        </div>
        {settings && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            settings.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {settings.configured ? '已配置' : '不可用'}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm font-semibold text-slate-500">正在加载 LLM 配置</p>
      ) : (
        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(360px,1.2fr)]">
          <dl className="space-y-4 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm font-semibold text-slate-500">配置来源</dt>
              <dd className="text-sm font-bold text-slate-800">{settings ? sourceLabels[settings.source] : '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm font-semibold text-slate-500">当前密钥</dt>
              <dd className="font-mono text-sm font-bold text-slate-800">{settings?.masked_key ?? '未配置'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm font-semibold text-slate-500">模型</dt>
              <dd className="max-w-64 truncate font-mono text-xs font-bold text-slate-800">{settings?.model ?? '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm font-semibold text-slate-500">API 地址</dt>
              <dd className="max-w-64 truncate font-mono text-xs font-bold text-slate-800" title={settings?.base_url}>{settings?.base_url ?? '-'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm font-semibold text-slate-500">地址来源</dt>
              <dd className="text-sm font-bold text-slate-800">{settings?.base_url_source === 'override' ? '管理员覆盖' : '.env 默认值'}</dd>
            </div>
          </dl>

          <div className="space-y-6">
            <div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-500">API Base URL</span>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleBaseUrlSave}
                  disabled={!baseUrl.trim() || action !== null}
                  className="h-10 rounded-lg border border-slate-950 bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {action === 'save-url' ? '保存中' : '保存 Base URL'}
                </button>
                {settings?.base_url_source === 'override' && (
                  <button
                    onClick={handleBaseUrlReset}
                    disabled={action !== null}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                  >
                    {action === 'reset-url' ? '恢复中' : '恢复 .env 地址'}
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-500">设置新的 API Key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="输入新的 API Key；现有密钥不会回显"
                autoComplete="new-password"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
              完整密钥只会在本次提交时发送，保存后界面仅显示末四位。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleSave}
                disabled={!apiKey.trim() || action !== null}
                className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {action === 'save-key' ? '保存中' : '保存 API Key'}
              </button>
              {settings?.source === 'override' && (
                <button
                  onClick={handleReset}
                  disabled={action !== null}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                >
                  {action === 'reset-key' ? '恢复中' : '恢复 .env 默认值'}
                </button>
              )}
            </div>
            {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
            {error && <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

const SettingsPage: React.FC<SettingsPageProps> = ({ username, role, activeSource, onNavigate }) => (
  <div className="space-y-6">
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card-surface rounded-xl p-5 sm:p-6">
        <p className="panel-eyebrow">Account</p>
        <h2 className="panel-title mt-1">账户信息</h2>
        <div className="mt-6 flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-lg font-black uppercase text-white">{username.slice(0, 1)}</div>
          <div>
            <p className="text-lg font-black text-slate-900">{username}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{role === 'admin' ? '系统管理员' : '数据分析员'}</p>
          </div>
        </div>
        <dl className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm font-semibold text-slate-500">分析权限</dt>
            <dd className="text-sm font-bold text-slate-800">可用</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm font-semibold text-slate-500">报表权限</dt>
            <dd className="text-sm font-bold text-slate-800">查看与创建</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm font-semibold text-slate-500">资产管理</dt>
            <dd className="text-sm font-bold text-slate-800">{role === 'admin' ? '可编辑' : '仅查看'}</dd>
          </div>
        </dl>
      </section>

      <section className="card-surface rounded-xl p-5 sm:p-6">
        <p className="panel-eyebrow">Workspace</p>
        <h2 className="panel-title mt-1">工作区状态</h2>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-900">{activeSource?.name ?? '未配置数据源'}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{activeSource?.connection_label ?? '当前无法执行数据分析'}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${activeSource?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {activeSource?.status === 'active' ? '连接正常' : '需要配置'}
            </span>
          </div>
          {activeSource && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white p-3">
                <p className="text-xl font-black text-slate-900">{activeSource.table_count}</p>
                <p className="text-xs font-semibold text-slate-500">数据表</p>
              </div>
              <div className="rounded-lg bg-white p-3">
                <p className="text-xl font-black text-slate-900">{activeSource.row_count.toLocaleString('zh-CN')}</p>
                <p className="text-xs font-semibold text-slate-500">数据行</p>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => onNavigate('data-assets')} className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
          查看数据资产
        </button>
      </section>
    </div>

    {role === 'admin' && <LlmSettingsCard />}
  </div>
);

export default SettingsPage;
