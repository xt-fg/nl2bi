import React, { useMemo, useState } from 'react';
import type { DataSourceInfo, SemanticField } from '../services/api';

interface DataAssetsPageProps {
  dataSources: DataSourceInfo[];
  semanticFields: SemanticField[];
  canManage: boolean;
  isLoading: boolean;
  onTestDataSource: (databaseUrl: string) => Promise<string>;
  onCreateDataSource: (name: string, databaseUrl: string) => Promise<void>;
  onUpdateSemanticField: (field: SemanticField) => Promise<void>;
}

const DataAssetsPage: React.FC<DataAssetsPageProps> = ({
  dataSources,
  semanticFields,
  canManage,
  isLoading,
  onTestDataSource,
  onCreateDataSource,
  onUpdateSemanticField,
}) => {
  const [sourceName, setSourceName] = useState('');
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [sourceMessage, setSourceMessage] = useState('');
  const [sourceBusy, setSourceBusy] = useState<'test' | 'save' | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [fieldMessage, setFieldMessage] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<SemanticField | null>(null);

  const activeSource = dataSources.find((source) => source.status === 'active') ?? dataSources[0];
  const selectedField = useMemo(
    () => semanticFields.find((field) => field.id === selectedFieldId) ?? semanticFields[0],
    [selectedFieldId, semanticFields],
  );
  const activeDraft = fieldDraft?.id === selectedField?.id ? fieldDraft : selectedField;
  const metricCount = semanticFields.filter((field) => field.field_type === 'metric').length;
  const dimensionCount = semanticFields.filter((field) => field.field_type === 'dimension').length;

  const handleSourceTest = async () => {
    if (!databaseUrl.trim()) return;
    setSourceBusy('test');
    setSourceMessage('');
    try {
      setSourceMessage(await onTestDataSource(databaseUrl.trim()));
    } catch (error) {
      setSourceMessage(error instanceof Error ? error.message : '连接测试失败');
    } finally {
      setSourceBusy(null);
    }
  };

  const handleSourceSave = async () => {
    if (!databaseUrl.trim()) return;
    setSourceBusy('save');
    setSourceMessage('');
    try {
      await onCreateDataSource(sourceName.trim() || '业务数据源', databaseUrl.trim());
      setSourceName('');
      setDatabaseUrl('');
      setSourceMessage('数据源已保存并激活');
    } catch (error) {
      setSourceMessage(error instanceof Error ? error.message : '保存数据源失败');
    } finally {
      setSourceBusy(null);
    }
  };

  const handleFieldSave = async () => {
    if (!activeDraft) return;
    setIsSavingField(true);
    setFieldMessage('');
    try {
      await onUpdateSemanticField(activeDraft);
      setFieldMessage('字段口径已更新');
    } catch (error) {
      setFieldMessage(error instanceof Error ? error.message : '更新字段口径失败');
    } finally {
      setIsSavingField(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card-surface rounded-xl px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-500">正在加载数据资产</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="card-surface rounded-xl p-5 md:col-span-1">
          <p className="text-xs font-bold text-slate-500">当前数据源</p>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-slate-950">{activeSource?.name ?? '尚未配置'}</p>
              <p className="mt-1 truncate text-xs font-medium text-slate-500">{activeSource?.connection_label ?? '请联系管理员接入数据源'}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              activeSource?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {activeSource?.status === 'active' ? '运行中' : '未连接'}
            </span>
          </div>
        </div>
        <div className="card-surface rounded-xl p-5">
          <p className="text-xs font-bold text-slate-500">数据规模</p>
          <p className="mt-3 text-2xl font-black text-slate-950">{activeSource?.table_count ?? 0} <span className="text-sm font-bold text-slate-400">张表</span></p>
          <p className="mt-1 text-xs font-medium text-slate-500">约 {(activeSource?.row_count ?? 0).toLocaleString('zh-CN')} 行可查询数据</p>
        </div>
        <div className="card-surface rounded-xl p-5">
          <p className="text-xs font-bold text-slate-500">业务语义</p>
          <p className="mt-3 text-2xl font-black text-slate-950">{semanticFields.length} <span className="text-sm font-bold text-slate-400">个字段</span></p>
          <p className="mt-1 text-xs font-medium text-slate-500">{metricCount} 个指标 · {dimensionCount} 个维度</p>
        </div>
      </section>

      {canManage && (
        <section className="card-surface rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <p className="panel-eyebrow">Connection</p>
            <h2 className="panel-title mt-1">接入数据源</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">测试并激活一个 SQLAlchemy 数据库连接。</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)_auto]">
            <input
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="数据源名称"
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <input
              value={databaseUrl}
              onChange={(event) => setDatabaseUrl(event.target.value)}
              placeholder="postgresql://user:password@host:5432/database"
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSourceTest}
                disabled={!databaseUrl.trim() || sourceBusy !== null}
                className="h-11 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sourceBusy === 'test' ? '测试中' : '测试连接'}
              </button>
              <button
                onClick={handleSourceSave}
                disabled={!databaseUrl.trim() || sourceBusy !== null}
                className="h-11 rounded-lg bg-slate-950 px-4 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
              >
                {sourceBusy === 'save' ? '保存中' : '保存并激活'}
              </button>
            </div>
          </div>
          {sourceMessage && <p className="mt-3 text-sm font-semibold text-slate-600">{sourceMessage}</p>}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="card-surface min-w-0 rounded-xl p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="panel-eyebrow">Semantic layer</p>
              <h2 className="panel-title mt-1">业务字段</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{semanticFields.length} 个字段</span>
          </div>

          {semanticFields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-medium text-slate-500">
              当前数据源还没有可用的语义字段
            </div>
          ) : (
            <div className="subtle-scrollbar overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['业务名称', '原始字段', '类型', '可查询'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-xs font-black text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {semanticFields.map((field) => (
                    <tr
                      key={field.id}
                      onClick={() => {
                        setSelectedFieldId(field.id);
                        setFieldDraft({ ...field });
                        setFieldMessage('');
                      }}
                      className={`cursor-pointer transition hover:bg-blue-50/60 ${selectedField?.id === field.id ? 'bg-blue-50/80' : ''}`}
                    >
                      <td className="px-4 py-3 text-sm font-bold text-slate-800">{field.display_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-500">{field.table_name}.{field.column_name}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                          field.field_type === 'metric'
                            ? 'bg-blue-50 text-blue-700'
                            : field.field_type === 'dimension'
                              ? 'bg-teal-50 text-teal-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {field.field_type === 'metric' ? '指标' : field.field_type === 'dimension' ? '维度' : '属性'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-slate-600">{field.is_queryable ? '是' : '否'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card-surface rounded-xl p-5 sm:p-6">
          <p className="panel-eyebrow">Definition</p>
          <h2 className="panel-title mt-1">字段口径</h2>
          {!activeDraft ? (
            <p className="mt-6 rounded-lg bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">请选择一个业务字段</p>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold text-slate-400">原始字段</p>
                <p className="mt-1 break-all font-mono text-xs font-bold text-slate-700">{activeDraft.table_name}.{activeDraft.column_name}</p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-500">业务名称</span>
                <input
                  value={activeDraft.display_name}
                  onChange={(event) => setFieldDraft({ ...activeDraft, display_name: event.target.value })}
                  disabled={!canManage}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-500">字段类型</span>
                <select
                  value={activeDraft.field_type}
                  onChange={(event) => setFieldDraft({ ...activeDraft, field_type: event.target.value as SemanticField['field_type'] })}
                  disabled={!canManage}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                >
                  <option value="metric">指标</option>
                  <option value="dimension">维度</option>
                  <option value="attribute">属性</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-500">业务说明</span>
                <textarea
                  value={activeDraft.description}
                  onChange={(event) => setFieldDraft({ ...activeDraft, description: event.target.value })}
                  disabled={!canManage}
                  rows={5}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium leading-6 text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={activeDraft.is_queryable}
                  onChange={(event) => setFieldDraft({ ...activeDraft, is_queryable: event.target.checked })}
                  disabled={!canManage}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                允许自然语言查询使用此字段
              </label>
              {canManage && (
                <button
                  onClick={handleFieldSave}
                  disabled={isSavingField || !activeDraft.display_name.trim()}
                  className="h-10 w-full rounded-lg bg-slate-950 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isSavingField ? '保存中' : '保存字段口径'}
                </button>
              )}
              {fieldMessage && <p className="text-sm font-semibold text-slate-600">{fieldMessage}</p>}
              {!canManage && <p className="text-xs font-medium leading-5 text-slate-500">当前角色拥有查看权限，字段口径由管理员维护。</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DataAssetsPage;
