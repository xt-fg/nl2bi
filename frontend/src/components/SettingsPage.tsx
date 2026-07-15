import React from 'react';
import type { DataSourceInfo } from '../services/api';
import type { PageKey } from './AppShell';

interface SettingsPageProps {
  username: string;
  role: string;
  activeSource?: DataSourceInfo;
  onNavigate: (page: PageKey) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ username, role, activeSource, onNavigate }) => (
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
);

export default SettingsPage;
