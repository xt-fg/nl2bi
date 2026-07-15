import { forwardRef, useImperativeHandle, useRef } from 'react';
import ReactECharts from 'echarts-for-react';

interface ChartRendererProps {
  option: Record<string, unknown>;
}

export interface ChartRendererHandle {
  getDataUrl: () => string | undefined;
}

const ChartRenderer = forwardRef<ChartRendererHandle, ChartRendererProps>(({ option }, ref) => {
  const chartRef = useRef<ReactECharts>(null);

  useImperativeHandle(ref, () => ({
    getDataUrl: () => chartRef.current?.getEchartsInstance().getDataURL({
      type: 'png',
      pixelRatio: 2,
    }),
  }), []);

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={{ height: '100%', width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  );
});

ChartRenderer.displayName = 'ChartRenderer';

export default ChartRenderer;
