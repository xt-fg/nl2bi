import React from 'react';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  onUseTable: () => void;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Chart rendering failed', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-4 text-center">
          <p className="text-sm font-bold text-slate-700">图表配置无法渲染</p>
          <p className="mt-1 text-xs font-medium text-slate-500">数据结果仍然可用，可以切换到表格继续查看。</p>
          <button
            onClick={this.props.onUseTable}
            className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
          >
            查看表格
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
