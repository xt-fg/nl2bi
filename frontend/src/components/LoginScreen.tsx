import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="workspace-bg flex min-h-screen items-center justify-center px-4">
      <div className="card-surface w-full max-w-sm rounded-lg p-6">
        <div className="mb-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
            BI
          </div>
          <p className="panel-eyebrow">NL2BI</p>
          <h1 className="mt-1 text-xl font-black text-slate-950">数据分析工作台</h1>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            使用账号登录后访问数据源、语义层、报表和查询审计。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">用户名</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-500">密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!username.trim() || !password || isLoading}
            className="h-11 w-full rounded-lg bg-slate-950 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {isLoading ? '登录中' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
