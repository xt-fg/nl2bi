import React from 'react';

export type PageKey = 'analysis' | 'reports' | 'data-assets' | 'query-records' | 'settings';

interface NavigationItem {
  key: PageKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  activePage: PageKey;
  username: string;
  role: string;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const iconClassName = 'h-5 w-5';

const navigationItems: NavigationItem[] = [
  {
    key: 'analysis',
    label: '数据分析',
    description: '提问与洞察',
    icon: (
      <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
      </svg>
    ),
  },
  {
    key: 'reports',
    label: '报表中心',
    description: '沉淀分析成果',
    icon: (
      <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3h8l4 4v14H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 3v5h5M9 13h6M9 17h6" />
      </svg>
    ),
  },
  {
    key: 'data-assets',
    label: '数据资产',
    description: '数据源与口径',
    icon: (
      <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <ellipse cx="12" cy="5" rx="8" ry="3" strokeWidth={1.8} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5v7c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12v7c0 1.66 3.58 3 8 3s8-1.34 8-3v-7" />
      </svg>
    ),
  },
  {
    key: 'query-records',
    label: '查询记录',
    description: '执行与审计',
    icon: (
      <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v5l3 2M3.5 12a8.5 8.5 0 108.5-8.5A8.48 8.48 0 005.3 6.8L3.5 8.5" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: '系统设置',
    description: '账户与工作区',
    icon: (
      <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21H9.6v-.1A1.7 1.7 0 008.5 19.3a1.7 1.7 0 00-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.1 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.1-.4H2.3V9.6h.1A1.7 1.7 0 004 8.5a1.7 1.7 0 00-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 008.4 4.1a1.7 1.7 0 001-.6 1.7 1.7 0 00.4-1.1V2.3h4v.1A1.7 1.7 0 0015 4a1.7 1.7 0 001.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0019.4 8c.15.38.36.72.66 1 .3.28.68.44 1.1.45h.1v4h-.1A1.7 1.7 0 0019.4 15z" />
      </svg>
    ),
  },
];

const pageCopy: Record<PageKey, { eyebrow: string; title: string; description: string }> = {
  analysis: {
    eyebrow: 'Analyze',
    title: '数据分析',
    description: '用自然语言探索当前数据源，并将结果沉淀为可复用报表。',
  },
  reports: {
    eyebrow: 'Reports',
    title: '报表中心',
    description: '集中查看和复用已保存的分析结果。',
  },
  'data-assets': {
    eyebrow: 'Data assets',
    title: '数据资产',
    description: '管理分析数据源、业务指标和维度口径。',
  },
  'query-records': {
    eyebrow: 'Audit',
    title: '查询记录',
    description: '追踪查询状态、返回行数、耗时和失败原因。',
  },
  settings: {
    eyebrow: 'Settings',
    title: '系统设置',
    description: '查看当前账户权限和工作区运行配置。',
  },
};

const AppShell: React.FC<AppShellProps> = ({
  activePage,
  username,
  role,
  onNavigate,
  onLogout,
  children,
}) => {
  const currentPage = pageCopy[activePage];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-slate-950 text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black">BI</div>
          <div>
            <p className="text-base font-black tracking-tight">NL2BI</p>
            <p className="text-xs font-medium text-slate-400">企业数据分析平台</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6" aria-label="主导航">
          {navigationItems.map((item) => {
            const isActive = activePage === item.key;
            return (
              <a
                key={item.key}
                href={`#${item.key}`}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(item.key);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className={`block text-xs font-medium ${isActive ? 'text-slate-500' : 'text-slate-500'}`}>
                    {item.description}
                  </span>
                </span>
              </a>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black uppercase">
              {username.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{username}</p>
              <p className="text-xs font-medium text-slate-400">{role === 'admin' ? '管理员' : '分析员'}</p>
            </div>
            <button
              onClick={onLogout}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              title="退出登录"
              aria-label="退出登录"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 17l5-5-5-5M15 12H3m10-9h6a2 2 0 012 2v14a2 2 0 01-2 2h-6" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">BI</div>
              <p className="text-sm font-black">NL2BI</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block lg:hidden">
                <p className="text-sm font-bold text-slate-800">{username}</p>
                <p className="text-xs font-semibold text-slate-500">{role === 'admin' ? '管理员' : '分析员'}</p>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 lg:hidden"
              >
                退出
              </button>
            </div>
          </div>

          <nav className="subtle-scrollbar flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden" aria-label="移动端导航">
            {navigationItems.map((item) => (
              <a
                key={item.key}
                href={`#${item.key}`}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(item.key);
                }}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${
                  activePage === item.key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="w-full">
            <div className="mb-7">
              <p className="panel-eyebrow">{currentPage.eyebrow}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{currentPage.title}</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{currentPage.description}</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
