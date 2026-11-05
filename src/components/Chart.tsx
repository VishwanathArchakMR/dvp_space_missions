import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function Chart({
  option,
  onClick,
  height = 330,
  className = 'chart'
}: {
  option: echarts.EChartsOption;
  onClick?: (v: string) => void;
  height?: number | string;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!el.current) return;
    
    // Initialize chart if not already created
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(el.current);
    }
    const c = chartInstance.current;
    c.setOption(option, true);

    const resize = () => {
      c.resize();
    };
    window.addEventListener('resize', resize);

    // Event listener
    c.off('click');
    if (onClick) {
      c.on('click', (p: any) => {
        // Can click on axis label, series item, or data point
        const clickedVal = p.name || (Array.isArray(p.value) ? p.value[0] : String(p.value));
        if (clickedVal) onClick(String(clickedVal));
      });
    }

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [option, onClick]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return <div ref={el} style={{ height }} className={className} />;
}
