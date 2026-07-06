import React, { useState } from 'react';
import type { DataSourceInfo, ReportSummary, SemanticField } from '../services/api';

interface ProductContextPanelProps {
  dataSources: DataSourceInfo[];
  semanticFields: SemanticField[];
  reports: ReportSummary[];
  onOpenReport: (id: number) => void;
  onTestDataSource: (databaseUrl: string) => Promise<string>;
  onCreateDataSource: (name: string, databaseUrl: string) => Promise<void>;
  onUpdateSemanticField: (field: SemanticField) => Promise<void>;
  canManageDataSources: boolean;
  isLoading?: boolean;
}

const ProductContextPanel: React.FC<ProductContextPanelProps> = ({
  dataSources,
  semanticFields,
  reports,
  onOpenReport,
  onTestDataSource,
  onCreateDataSource,
  onUpdateSemanticField,
  canManageDataSources,
  isLoading = false,
}) => {
  const [sourceName, setSourceName] = useState('');
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [sourceMessage, setSourceMessage] = useState('');
  const [isTestingSource, setIsTestingSource] = useState(false);
  const [isSavingSource, setIsSavingSource] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [semanticMessage, setSemanticMessage] = useState('');
  const [isSavingSemantic, setIsSavingSemantic] = useState(false);
  const [semanticDraft, setSemanticDraft] = useState({
    field_id: null as number | null,
    display_name: '',
    field_type: 'metric' as SemanticField['field_type'],
    description: '',
    is_queryable: true,
  });
  const metrics = semanticFields.filter((field) => field.field_type === 'metric' && field.is_queryable);
  const dimensions = semanticFields.filter((field) => field.field_type === 'dimension' && field.is_queryable);
  const selectedField = semanticFields.find((field) => field.id === selectedFieldId) ?? semanticFields[0];
  const activeSemanticDraft = selectedField && semanticDraft.field_id === selectedField.id
    ? semanticDraft
    : {
        field_id: selectedField?.id ?? null,
        display_name: selectedField?.display_name ?? '',
        field_type: selectedField?.field_type ?? 'metric',
        description: selectedField?.description ?? '',
        is_queryable: selectedField?.is_queryable ?? true,
      };

  const handleTest = async () => {
    if (!databaseUrl.trim()) return;
    setIsTestingSource(true);
    setSourceMessage('');
    try {
      const message = await onTestDataSource(databaseUrl.trim());
      setSourceMessage(message);
    } catch (error) {
      setSourceMessage(error instanceof Error ? error.message : '连接测试失败');
    } finally {
      setIsTestingSource(false);
    }
  };

  const handleSave = async () => {
    if (!databaseUrl.trim()) return;
    setIsSavingSource(true);
    setSourceMessage('');
    try {
      await onCreateDataSource(sourceName.trim() || '业务数据源', databaseUrl.trim());
      setSourceName('');
      setDatabaseUrl('');
      setSourceMessage('数据源已保存并激活');
    } catch (error) {
      setSourceMessage(error instanceof Error ? error.message : '保存数据源失败');
    } finally {
      setIsSavingSource(false);
    }
  };

  const handleSemanticSave = async () => {
    if (!selectedField) return;
    setIsSavingSemantic(true);
    setSemanticMessage('');
    try {
      await onUpdateSemanticField({
        ...selectedField,
        display_name: activeSemanticDraft.display_name,
        field_type: activeSemanticDraft.field_type,
        description: activeSemanticDraft.description,
        is_queryable: activeSemanticDraft.is_queryable,
      });
      setSemanticMessage('语义字段已更新');
    } catch (error) {
      setSemanticMessage(error instanceof Error ? error.message : '更新语义字段失败');
    } finally {
      setIsSavingSemantic(false);
    }
  };

  return (
    <div className="card-surface rounded-lg p-5">
      <div className="mb-4">
        <p className="panel-eyebrow">Workspace</p>
        <h3 className="panel-title mt-1">业务工作区</h3>
      </div>

      {isLoading ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm font-medium text-slate-500">
          正在加载配置
        </p>
      ) : (
        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-500">数据源</h4>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {dataSources[0]?.status ?? 'unknown'}
              </span>
            </div>
            {dataSources[0] ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-sm font-bold text-slate-800">{dataSources[0].name}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{dataSources[0].connection_label}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-slate-50 px-2 py-1.5">
                    <p className="text-lg font-black text-slate-900">{dataSources[0].table_count}</p>
                    <p className="text-xs font-semibold text-slate-500">表</p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-2 py-1.5">
                    <p className="text-lg font-black text-slate-900">{dataSources[0].row_count}</p>
                    <p className="text-xs font-semibold text-slate-500">行</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-500">暂无数据源</p>
            )}
          </section>

          {canManageDataSources && (
            <section>
              <h4 className="mb-2 text-xs font-black uppercase text-slate-500">连接配置</h4>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  placeholder="数据源名称"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <input
                  value={databaseUrl}
                  onChange={(event) => setDatabaseUrl(event.target.value)}
                  placeholder="sqlite:///./data.db 或 postgresql://..."
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTest}
                    disabled={!databaseUrl.trim() || isTestingSource}
                    className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isTestingSource ? '测试中' : '测试连接'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!databaseUrl.trim() || isSavingSource}
                    className="h-9 flex-1 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {isSavingSource ? '保存中' : '保存激活'}
                  </button>
                </div>
                {sourceMessage && (
                  <p className="text-xs font-semibold leading-5 text-slate-500">{sourceMessage}</p>
                )}
              </div>
            </section>
          )}

          <section>
            <h4 className="mb-2 text-xs font-black uppercase text-slate-500">语义层</h4>
            <div className="space-y-2">
              <div>
                <p className="mb-1 text-xs font-bold text-slate-500">指标</p>
                <div className="flex flex-wrap gap-1.5">
                  {metrics.slice(0, 6).map((field) => (
                    <span key={field.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                      {field.display_name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-slate-500">维度</p>
                <div className="flex flex-wrap gap-1.5">
                  {dimensions.slice(0, 6).map((field) => (
                    <span key={field.id} className="rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700">
                      {field.display_name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {canManageDataSources && selectedField && (
              <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <select
                  value={selectedField.id}
                  onChange={(event) => {
                    const nextField = semanticFields.find((field) => field.id === Number(event.target.value));
                    setSelectedFieldId(Number(event.target.value));
                    if (nextField) {
                      setSemanticDraft({
                        field_id: nextField.id,
                        display_name: nextField.display_name,
                        field_type: nextField.field_type,
                        description: nextField.description,
                        is_queryable: nextField.is_queryable,
                      });
                    }
                  }}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {semanticFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.table_name}.{field.column_name}
                    </option>
                  ))}
                </select>
                <input
                  value={activeSemanticDraft.display_name}
                  onChange={(event) => setSemanticDraft((draft) => ({
                    ...draft,
                    field_id: selectedField.id,
                    display_name: event.target.value,
                  }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <select
                  value={activeSemanticDraft.field_type}
                  onChange={(event) => setSemanticDraft((draft) => ({
                    ...draft,
                    field_id: selectedField.id,
                    field_type: event.target.value as SemanticField['field_type'],
                  }))}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="metric">指标</option>
                  <option value="dimension">维度</option>
                  <option value="attribute">属性</option>
                </select>
                <textarea
                  value={activeSemanticDraft.description}
                  onChange={(event) => setSemanticDraft((draft) => ({
                    ...draft,
                    field_id: selectedField.id,
                    description: event.target.value,
                  }))}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
                <button
                  onClick={handleSemanticSave}
                  disabled={isSavingSemantic}
                  className="h-9 w-full rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {isSavingSemantic ? '保存中' : '保存字段口径'}
                </button>
                {semanticMessage && (
                  <p className="text-xs font-semibold leading-5 text-slate-500">{semanticMessage}</p>
                )}
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 text-xs font-black uppercase text-slate-500">已保存报表</h4>
            {reports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-sm font-medium text-slate-500">
                暂无保存报表
              </p>
            ) : (
              <div className="subtle-scrollbar max-h-48 space-y-2 overflow-y-auto pr-1">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => onOpenReport(report.id)}
                    className="w-full rounded-lg border border-slate-100 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="line-clamp-1 text-sm font-bold text-slate-800">{report.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                      {report.insight_summary || report.query}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default ProductContextPanel;
