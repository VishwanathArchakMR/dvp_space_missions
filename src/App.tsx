import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Moon, Sun, Upload, RotateCcw, Download, Search, Database,
  MapPin, Building2, Target, Globe, ShieldCheck, TrendingUp,
  BarChart2, Activity, Info, X, ChevronRight, Layers, Sliders, Box,
  Sparkles, Compass, Gauge
} from 'lucide-react';
import Papa from 'papaparse';
import Chart from './components/Chart';
import Intro from './components/Intro';
import WorldMap from './components/WorldMap';
import TableauShelf from './components/TableauShelf';
import DataHealthModal from './components/DataHealthModal';
import DataAnalysisToolsPanel from './components/DataAnalysisToolsPanel';
import {
  Filters, Mission, MarksConfig, GroupingConfig, ParameterConfig,
  HierarchyState, AnalyticsConfig, ActionConfig
} from './types/mission';
import {
  group, isFailure, isSuccess, joinLaunchesAndSatellites, parseCsv,
  validateDataset, computeBoxPlotStats, computeTrendLine, computeForecast,
  computeHistogramBins, MONTH_NAMES, getRegionForCountry,
  getDecadeForYear, computeKMeansClusters
} from './utils/data';

const palette = ['#65d9ff', '#9875ff', '#ff8bbd', '#5ee5ad', '#ffbf69', '#6d8eff', '#df7cff'];

function Panel({
  title,
  children,
  wide = false,
  badge,
  tools,
  bgImage,
  className = ''
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
  badge?: string;
  tools?: React.ReactNode;
  bgImage?: string;
  className?: string;
}) {
  return (
    <section
      className={`panel ${wide ? 'wide' : ''} ${bgImage ? 'has-bg-image' : ''} ${className}`}
      style={bgImage ? { backgroundImage: `url('${bgImage}')` } : undefined}
    >
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <span className="panel-title mb-0">{title}</span>
          {badge && (
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#65d9ff]/15 text-[#65d9ff] border border-[#65d9ff]/30">
              {badge}
            </span>
          )}
        </div>
        {tools && <div className="flex items-center gap-2">{tools}</div>}
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export default function App() {
  const [rows, setRows] = useState<Mission[]>([]);
  const [defaultRows, setDefaultRows] = useState<Mission[]>([]);
  const [rawDatasets, setRawDatasets] = useState<{ launches: any[]; satellites: any[]; spaceMissions: any[] }>({
    launches: [],
    satellites: [],
    spaceMissions: []
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof window !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [intro, setIntro] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<'year' | 'company' | 'outcome' | 'cost'>('year');

  // Tableau Workbench States
  const [countrySort, setCountrySort] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [countryTopN, setCountryTopN] = useState<5 | 10 | 'all'>(10);
  const [topN, setTopN] = useState<5 | 10 | 20>(10);
  const [heatmapMode, setHeatmapMode] = useState<'country-year' | 'org-year' | 'month-year'>('country-year');
  const [histogramMode, setHistogramMode] = useState<'payloads' | 'cost'>('payloads');
  const [histogramBinsCount, setHistogramBinsCount] = useState<6 | 8 | 12>(8);
  const [boxPlotCategory, setBoxPlotCategory] = useState<'country' | 'company'>('country');
  const [isDataHealthOpen, setIsDataHealthOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'missions' | 'cost' | 'successRate'>('missions');

  // Tableau Marks Card Configuration
  const [marksConfig, setMarksConfig] = useState<MarksConfig>({
    colorEncoding: 'default',
    sizeEncoding: 'default',
    showLabels: true,
    tooltipDetail: 'standard'
  });

  // Tableau Grouping Configuration
  const [groupingConfig, setGroupingConfig] = useState<GroupingConfig>({
    groupByContinent: false,
    groupByDecade: false,
    binaryOutcome: false
  });

  // Tableau Parameter Configuration
  const [parameterConfig, setParameterConfig] = useState<ParameterConfig>({
    targetMetric: 'missions',
    timeHorizon: [1990, 2024],
    activeVisualization: 'bar'
  });

  // Tableau Hierarchy Drill-Down State
  const [hierarchyState, setHierarchyState] = useState<HierarchyState>({
    timeLevel: 'year',
    geoLevel: 'country'
  });

  // Tableau Analytics Pane Configuration
  const [analyticsConfig, setAnalyticsConfig] = useState<AnalyticsConfig>({
    refLineMode: 'average',
    customRefValue: 50,
    enableTrendLine: true,
    enableForecast: false,
    enableClustering: false,
    clusterCount: 3
  });

  // Tableau Dashboard Actions Configuration
  const [actionConfig, setActionConfig] = useState<ActionConfig>({
    crossFilter: true,
    crossHighlight: true
  });

  // Load and cache raw datasets on startup for join engine
  useEffect(() => {
    Promise.all([
      fetch('/data/launches.csv').then(r => r.text()),
      fetch('/data/satellites.csv').then(r => r.text()),
      fetch('/data/space_missions.csv').then(r => r.text()).catch(() => '')
    ])
      .then(([launchesText, satellitesText, spaceMissionsText]) => {
        const rawL = Papa.parse(launchesText, { header: true, skipEmptyLines: true }).data;
        const rawS = Papa.parse(satellitesText, { header: true, skipEmptyLines: true }).data;
        const rawM = spaceMissionsText ? Papa.parse(spaceMissionsText, { header: true, skipEmptyLines: true }).data : [];
        setRawDatasets({ launches: rawL, satellites: rawS, spaceMissions: rawM });

        const joined = joinLaunchesAndSatellites(launchesText, satellitesText, spaceMissionsText);
        setRows(joined);
        setDefaultRows(joined);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 3800);
    return () => clearTimeout(t);
  }, []);

  // Compute dataset year range
  const range = useMemo(() => {
    const ys = rows.map(r => r.year).filter((x): x is number => !!x);
    if (!ys.length) return [1990, 2024] as [number, number];
    const max = Math.max(...ys, 2024);
    const min = Math.min(...ys, max - 30);
    return [Math.max(min, max - 34), max] as [number, number];
  }, [rows]);

  const [filters, setFilters] = useState<Filters>({
    years: [1990, 2024],
    company: 'All',
    outcome: 'All',
    site: 'All',
    rocketStatus: 'All',
    country: 'All',
    region: 'All',
    month: 'All'
  });

  useEffect(() => {
    setFilters(f => ({ ...f, years: range }));
  }, [range[0], range[1]]);

  const choices = (fn: (r: Mission) => string) => ['All', ...group(rows, fn).map(x => x[0])];

  // Helper for cross-filtering (guarded by actionConfig.crossFilter)
  const upd = (k: keyof Filters, v: any) => {
    if (!actionConfig.crossFilter && k !== 'years') return;
    setFilters(f => ({ ...f, [k]: v }));
  };

  // Main filtered dataset (with grouping transformations applied)
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const yearOk = !r.year || (r.year >= filters.years[0] && r.year <= filters.years[1]);
      const compOk = filters.company === 'All' || r.company === filters.company;
      const outOk = filters.outcome === 'All' || r.outcome === filters.outcome;
      const siteOk = filters.site === 'All' || r.site === filters.site;
      const countryOk = filters.country === 'All' || r.country === filters.country;
      const regionOk = filters.region === 'All' || r.region === filters.region;
      const monthOk = filters.month === 'All' || r.month === filters.month;
      const rocketOk = filters.rocketStatus === 'All' || r.rocketStatus === filters.rocketStatus;
      return yearOk && compOk && outOk && siteOk && countryOk && regionOk && monthOk && rocketOk;
    });
  }, [rows, filters]);

  // Aggregations
  const outcomes = useMemo(() => {
    if (groupingConfig.binaryOutcome) {
      return group(filtered, r => isSuccess(r.outcome) ? 'Success' : 'Failure / Other');
    }
    return group(filtered, r => r.outcome);
  }, [filtered, groupingConfig.binaryOutcome]);

  const orgs = useMemo(() => group(filtered, r => r.company), [filtered]);

  const locations = useMemo(() => {
    if (groupingConfig.groupByContinent || hierarchyState.geoLevel === 'region') {
      return group(filtered, r => r.region);
    }
    if (hierarchyState.geoLevel === 'site') {
      return group(filtered, r => r.site);
    }
    return group(filtered, r => r.country);
  }, [filtered, groupingConfig.groupByContinent, hierarchyState.geoLevel]);

  const success = useMemo(() => filtered.filter(r => isSuccess(r.outcome)).length, [filtered]);
  const fail = useMemo(() => filtered.filter(r => isFailure(r.outcome)).length, [filtered]);

  // Time series: annual or decade
  const annual = useMemo(() => {
    if (groupingConfig.groupByDecade || hierarchyState.timeLevel === 'decade') {
      const decadeMap: Record<string, { total: number; succ: number }> = {};
      filtered.forEach(r => {
        const d = getDecadeForYear(r.year);
        if (!decadeMap[d]) decadeMap[d] = { total: 0, succ: 0 };
        decadeMap[d].total++;
        if (isSuccess(r.outcome)) decadeMap[d].succ++;
      });
      return Object.entries(decadeMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([dec, vals]) => [dec, vals.total, vals.succ] as any);
    }

    const start = filters.years[0];
    const end = filters.years[1];
    const yearsList = Array.from({ length: Math.max(1, end - start + 1) }, (_, i) => start + i);
    return yearsList.map(y => {
      const yearMissions = filtered.filter(r => r.year === y);
      const yearSuccess = yearMissions.filter(r => isSuccess(r.outcome)).length;
      return [y, yearMissions.length, yearSuccess] as [number, number, number];
    });
  }, [filtered, filters.years, groupingConfig.groupByDecade, hierarchyState.timeLevel]);

  // Monthly seasonality
  const monthlySeasonality = useMemo(() => {
    return MONTH_NAMES.map(m => {
      const monthMissions = filtered.filter(r => r.month === m);
      const succ = monthMissions.filter(r => isSuccess(r.outcome)).length;
      return [m, monthMissions.length, succ] as [string, number, number];
    });
  }, [filtered]);

  // Time Series Forecast (5-Year Projection)
  const forecastData = useMemo(() => {
    if (!analyticsConfig.enableForecast) return [];
    const annualPoints = annual
      .filter(x => typeof x[0] === 'number')
      .map(([y, total]) => [y, total] as [number, number]);
    return computeForecast(annualPoints, 5);
  }, [annual, analyticsConfig.enableForecast]);

  // Histograms
  const payloadBins = useMemo(() => {
    const vals = filtered.map(r => r.payloadCount).filter(v => v > 0);
    return computeHistogramBins(vals, histogramBinsCount);
  }, [filtered, histogramBinsCount]);

  const costBins = useMemo(() => {
    const vals = filtered.map(r => r.cost).filter((v): v is number => v !== null && v > 0);
    return computeHistogramBins(vals, histogramBinsCount);
  }, [filtered, histogramBinsCount]);

  // Box Plot Data
  const boxPlotStats = useMemo(() => {
    const targetGroups = boxPlotCategory === 'country' ? locations.slice(0, 8) : orgs.slice(0, 8);
    const groupsData = targetGroups.map(([name]) => {
      const values = filtered
        .filter(r => (boxPlotCategory === 'country' ? r.country : r.company) === name)
        .map(r => r.cost)
        .filter((v): v is number => v !== null && v > 0);
      return { name, values };
    });
    return computeBoxPlotStats(groupsData);
  }, [filtered, boxPlotCategory, locations, orgs]);

  // Scatter Plot Data with optional K-Means Clustering
  const scatterData = useMemo(() => {
    const withCost = filtered.filter(r => r.cost !== null && r.cost > 0);
    const points = withCost.map((r, idx) => ({
      id: String(idx),
      name: r.detail || r.rocket,
      cost: r.cost!,
      payloads: r.payloadCount || 1,
      year: r.year || 2000,
      company: r.company,
      outcome: r.outcome,
      region: r.region
    }));

    const xyPoints: [number, number][] = points.map(p => [p.payloads, p.cost]);
    const trendLine = computeTrendLine(xyPoints);

    let clusteredPoints: any[] = [];
    if (analyticsConfig.enableClustering) {
      const clusterInput = points.map(p => ({
        id: p.id,
        x: p.payloads,
        y: p.cost,
        label: p.name,
        company: p.company
      }));
      clusteredPoints = computeKMeansClusters(clusterInput, analyticsConfig.clusterCount);
    }

    return { points, trendLine, clusteredPoints };
  }, [filtered, analyticsConfig.enableClustering, analyticsConfig.clusterCount]);

  // Data Validation Report
  const dataReport = useMemo(() => validateDataset(rows), [rows]);

  // Dynamic Outlier Detection
  const costOutliers = useMemo(() => {
    const costs = filtered.map(r => r.cost).filter((c): c is number => c !== null && c > 0).sort((a, b) => a - b);
    if (costs.length < 10) return [];
    const q1 = costs[Math.floor(costs.length * 0.25)];
    const q3 = costs[Math.floor(costs.length * 0.75)];
    const iqr = q3 - q1;
    const fence = q3 + 1.5 * iqr;
    return filtered.filter(r => r.cost !== null && r.cost > fence).slice(0, 6);
  }, [filtered]);

  // Active filters list
  const activeFilters = useMemo(() => {
    const list: { key: keyof Filters; label: string; value: string }[] = [];
    if (filters.country !== 'All') list.push({ key: 'country', label: 'Country', value: filters.country });
    if (filters.region !== 'All') list.push({ key: 'region', label: 'Region', value: filters.region });
    if (filters.company !== 'All') list.push({ key: 'company', label: 'Organization', value: filters.company });
    if (filters.outcome !== 'All') list.push({ key: 'outcome', label: 'Outcome', value: filters.outcome });
    if (filters.site !== 'All') list.push({ key: 'site', label: 'Launch Site', value: filters.site });
    if (filters.rocketStatus !== 'All') list.push({ key: 'rocketStatus', label: 'Rocket Status', value: filters.rocketStatus });
    if (filters.month !== 'All') list.push({ key: 'month', label: 'Month', value: filters.month });
    return list;
  }, [filters]);

  const resetAllFilters = () => {
    setFilters({
      years: range,
      company: 'All',
      outcome: 'All',
      site: 'All',
      rocketStatus: 'All',
      country: 'All',
      region: 'All',
      month: 'All'
    });
  };

  // Helper for Chart styling
  const chartOption = (series: any[], x?: string[], yAxisLabel?: string, extra?: any): any => {
    const textColor = theme === 'dark' ? '#9ba9c9' : '#5a6b8c';
    const splitLineColor = theme === 'dark' ? 'rgba(146,170,220,.12)' : 'rgba(80,110,160,.14)';
    const tipBg = theme === 'dark' ? 'rgba(12,17,38,.92)' : 'rgba(245,248,255,.96)';
    const tipText = theme === 'dark' ? '#fff' : '#10213e';

    return {
      animationDuration: 500,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tipBg,
        borderColor: 'rgba(101,217,255,0.4)',
        textStyle: { color: tipText, fontSize: 12 },
        ...extra?.tooltip
      },
      grid: { left: 45, right: 25, top: 28, bottom: 40, containLabel: true },
      xAxis: x
        ? {
            type: 'category',
            data: x,
            axisLabel: { color: textColor, fontSize: 11 },
            axisLine: { lineStyle: { color: splitLineColor } }
          }
        : {
            type: 'value',
            axisLabel: { color: textColor, fontSize: 11 },
            splitLine: { lineStyle: { color: splitLineColor } }
          },
      yAxis: x
        ? {
            type: 'value',
            name: yAxisLabel,
            nameTextStyle: { color: textColor, fontSize: 10 },
            axisLabel: { color: textColor, fontSize: 11 },
            splitLine: { lineStyle: { color: splitLineColor } }
          }
        : {
            type: 'category',
            axisLabel: { color: textColor, fontSize: 11 },
            axisLine: { show: false }
          },
      series,
      ...extra
    };
  };

  // KPI Metrics
  const filteredWithCost = useMemo(() => filtered.filter(r => r.cost !== null && r.cost > 0), [filtered]);
  const costSum = useMemo(() => filteredWithCost.reduce((s, r) => s + (r.cost || 0), 0), [filteredWithCost]);
  const avgCostVal = filteredWithCost.length ? (costSum / filteredWithCost.length).toFixed(1) : null;

  const kpis = [
    ['Total Missions', filtered.length.toLocaleString(), Target, 'COUNT([Missions]) in active filter range'],
    ['Successful', success.toLocaleString(), ShieldCheck, 'COUNT(Missions WHERE Outcome = "Success")'],
    [
      'Success Rate',
      filtered.length ? `${((success / filtered.length) * 100).toFixed(1)}%` : '—',
      Activity,
      '(Successful Missions / Total Missions) × 100'
    ],
    ['Countries Active', new Set(filtered.map(r => r.country)).size, Globe, 'COUNTD([Country]) with launch activity'],
    ['Organizations', new Set(filtered.map(r => r.company)).size, Building2, 'COUNTD([Organization / Provider])'],
    ['Catalogued Payloads', filtered.reduce((s, r) => s + r.payloadCount, 0).toLocaleString(), Target, 'SUM([payloads_catalogued]) linked to missions'],
    ['Average Cost', avgCostVal ? `$${avgCostVal}M` : '—', TrendingUp, 'SUM(Cost) / COUNT(Missions with recorded cost)']
  ];

  // Country bar chart sorted list
  const sortedCountries = useMemo(() => {
    let list = [...locations];
    if (countrySort === 'asc') list.sort((a, b) => a[1] - b[1]);
    else if (countrySort === 'alpha') list.sort((a, b) => a[0].localeCompare(b[0]));
    else list.sort((a, b) => b[1] - a[1]);

    if (countryTopN === 5) return list.slice(0, 5);
    if (countryTopN === 10) return list.slice(0, 10);
    return list;
  }, [locations, countrySort, countryTopN]);

  // Table Sorting and Pagination
  const table = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sort === 'cost') return (b.cost || 0) - (a.cost || 0);
      return String(a[sort] ?? '').localeCompare(String(b[sort] ?? ''));
    });
  }, [filtered, sort]);

  // CSV Export
  const download = () => {
    const blob = new Blob(
      [
        [
          ['Organization', 'Date', 'Country', 'Region', 'Location', 'Outcome', 'Rocket', 'Cost ($M)', 'Payloads'].join(','),
          ...filtered.map(r =>
            [
              r.company,
              r.date?.toISOString() || '',
              r.country,
              r.region,
              r.site,
              r.outcome,
              r.rocket,
              r.cost ?? '',
              r.payloadCount
            ]
              .map(x => '"' + String(x ?? '').replace(/"/g, '""') + '"')
              .join(',')
          )
        ].join('\n')
      ],
      { type: 'text/csv' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'space-missions-analytics-export.csv';
    a.click();
  };

  // MarkLine configuration for reference lines
  const referenceMarkLine = useMemo(() => {
    if (analyticsConfig.refLineMode === 'none') return undefined;
    const totals = annual.map(x => x[1]);
    if (!totals.length) return undefined;
    const avg = Math.round(totals.reduce((s, x) => s + x, 0) / totals.length);
    const sorted = [...totals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      silent: false,
      data: [
        analyticsConfig.refLineMode === 'average'
          ? { type: 'average', name: `Avg: ${avg}`, lineStyle: { color: '#65d9ff', type: 'dashed' as const } }
          : analyticsConfig.refLineMode === 'median'
          ? { yAxis: median, name: `Median: ${median}`, lineStyle: { color: '#ffbf69', type: 'dashed' as const } }
          : { yAxis: analyticsConfig.customRefValue, name: `Custom: ${analyticsConfig.customRefValue}`, lineStyle: { color: '#df7cff', type: 'dashed' as const } }
      ],
      label: { color: '#cfd8ed', fontSize: 10, position: 'insideEndTop' }
    };
  }, [annual, analyticsConfig.refLineMode, analyticsConfig.customRefValue]);

  // Dynamic Show Me Visualization Render Option
  const dynamicShowMeOption = useMemo(() => {
    const vis = parameterConfig.activeVisualization;
    const labelShow = marksConfig.showLabels;

    if (vis === 'bar') {
      const topData = locations.slice(0, 10);
      return chartOption(
        [
          {
            type: 'bar',
            data: topData.map(([, v]) => v),
            itemStyle: { color: '#65d9ff', borderRadius: [0, 8, 8, 0] },
            label: { show: labelShow, position: 'right', color: '#cfd8ed', fontSize: 10 }
          }
        ],
        undefined,
        undefined,
        {
          yAxis: {
            type: 'category',
            data: topData.map(x => x[0]),
            axisLabel: { color: '#9ba9c9', fontSize: 11 }
          }
        }
      );
    }

    if (vis === 'line') {
      return chartOption(
        [
          {
            name: 'Missions',
            type: 'line',
            smooth: true,
            data: annual.map(x => x[1]),
            lineStyle: { color: '#65d9ff', width: 3 },
            areaStyle: { color: 'rgba(101,217,255,0.15)' }
          }
        ],
        annual.map(x => String(x[0])),
        'Missions'
      );
    }

    if (vis === 'pie') {
      return {
        tooltip: { trigger: 'item' },
        series: [
          {
            type: 'pie',
            radius: ['42%', '72%'],
            data: outcomes.map(([name, value], i) => ({
              name,
              value,
              itemStyle: { color: palette[i % palette.length] }
            })),
            label: { show: labelShow, formatter: '{b}: {d}%', color: '#cfd8ed', fontSize: 10 }
          }
        ]
      };
    }

    if (vis === 'treemap') {
      return {
        tooltip: { formatter: '{b}: {c} missions' },
        series: [
          {
            type: 'treemap',
            breadcrumb: { show: false },
            data: orgs.slice(0, 16).map(([name, value], i) => ({
              name,
              value,
              itemStyle: { color: palette[i % palette.length] }
            }))
          }
        ]
      };
    }

    if (vis === 'scatter') {
      if (analyticsConfig.enableClustering && scatterData.clusteredPoints.length > 0) {
        const clusterColors = ['#65d9ff', '#5ee5ad', '#ffbf69', '#df7cff'];
        return {
          tooltip: {
            trigger: 'item',
            formatter: (p: any) => `<b>${p.data[3]}</b><br/>Cluster: ${p.data[4]}<br/>Payloads: ${p.data[0]}<br/>Cost: $${p.data[1]}M`
          },
          grid: { left: 55, right: 25, top: 25, bottom: 40 },
          xAxis: { type: 'value', name: 'Payloads' },
          yAxis: { type: 'value', name: 'Cost ($M)' },
          series: [
            {
              type: 'scatter',
              symbolSize: 10,
              data: scatterData.clusteredPoints.map(c => [
                c.point.x,
                c.point.y,
                c.point.company,
                c.point.label,
                `Cluster ${c.clusterIndex + 1}`
              ]),
              itemStyle: {
                color: (p: any) => clusterColors[p.data[4].split(' ')[1] - 1] || '#65d9ff'
              }
            }
          ]
        };
      }
      return chartOption(
        [
          {
            type: 'scatter',
            symbolSize: 8,
            itemStyle: { color: '#df7cff' },
            data: scatterData.points.map(p => [p.payloads, p.cost])
          }
        ],
        undefined,
        'Cost ($M)'
      );
    }

    // Default fallback to bar
    return chartOption(
      [{ type: 'bar', data: locations.slice(0, 8).map(x => x[1]), itemStyle: { color: '#5ee5ad' } }],
      locations.slice(0, 8).map(x => x[0]),
      'Missions'
    );
  }, [parameterConfig.activeVisualization, locations, annual, outcomes, orgs, scatterData, analyticsConfig, marksConfig]);

  return (
    <main className={theme}>
      {intro && <Intro close={() => setIntro(false)} />}

      {/* Navigation Bar */}
      <nav>
        <div className="brand">
          <span>✦</span>
          <div>
            <b>ORBITAL ATLAS</b>
            <small>A Visual Analysis of Global Space Missions · Tableau Analytics Platform</small>
          </div>
        </div>
        <div className="navlinks">
          <a href="#dashboard">Dashboard</a>
          <a href="#workbench">Analysis Tools</a>
          <a href="#geography">Geographic Map</a>
          <a href="#analytics">Advanced Analytics</a>
          <a href="#explore">Data Explorer</a>
          <button
            onClick={() => setIsDataHealthOpen(true)}
            className="dataset-btn"
            title="Inspect Data Validation & Schema Relationships"
          >
            <ShieldCheck size={14} className="text-[#5ee5ad]" />
            <span className="text-[11px] font-mono">Data Health: {dataReport.completenessRate}%</span>
          </button>
          <label className="upload">
            <Upload size={14} /> Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const f = e.target.files?.[0];
                if (f) f.text().then(x => setRows(parseCsv(x)));
              }}
            />
          </label>
          <button aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </nav>

      {/* Hero Header with Cinematic Space & Earth Background */}
      <div className="hero-backdrop-wrapper">
        <header>
          <div>
            <p className="eyebrow">A VISUAL ANALYSIS OF GLOBAL SPACE MISSIONS</p>
            <h1>
              Explore the arcs of<br />
              <em>human ambition.</em>
            </h1>
            <p className="lede">
              Web-based interactive data visualization and analysis platform inspired by Tableau.
            </p>
          </div>
          <div className="dataset cursor-pointer" onClick={() => setIsDataHealthOpen(true)}>
            <Database />
            <b>{rows.length.toLocaleString()}</b>
            <span>launches joined to satellite & cost catalog</span>
            <small>
              <span>{filters.years[0]} — {filters.years[1]} · 3 Datasets Linked</span>
              <span className="text-[#65d9ff] font-mono hover:underline flex items-center">
                Schema <ChevronRight size={12} />
              </span>
            </small>
          </div>
        </header>
      </div>

      {/* Sticky Global Filters Bar */}
      <div className="filters-wrapper">
        <div className="filters">
          <label>
            From Year
            <input
              type="number"
              value={filters.years[0]}
              min={range[0]}
              max={filters.years[1]}
              onChange={e => upd('years', [+e.target.value, filters.years[1]])}
            />
          </label>
          <label>
            To Year
            <input
              type="number"
              value={filters.years[1]}
              min={filters.years[0]}
              max={range[1]}
              onChange={e => upd('years', [filters.years[0], +e.target.value])}
            />
          </label>
          <label>
            Country
            <select value={filters.country} onChange={e => upd('country', e.target.value)}>
              {choices(r => r.country).map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Region / Continent
            <select value={filters.region} onChange={e => upd('region', e.target.value)}>
              {choices(r => r.region).map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Organization
            <select value={filters.company} onChange={e => upd('company', e.target.value)}>
              {choices(r => r.company).map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Mission Outcome
            <select value={filters.outcome} onChange={e => upd('outcome', e.target.value)}>
              {choices(r => r.outcome).map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Launch Site
            <select value={filters.site} onChange={e => upd('site', e.target.value)}>
              {choices(r => r.site).map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Rocket Status
            <select value={filters.rocketStatus} onChange={e => upd('rocketStatus', e.target.value)}>
              {choices(r => r.rocketStatus).map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <button className="reset" onClick={resetAllFilters} title="Reset all active filters">
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {/* Active Filter Pills Strip */}
        {activeFilters.length > 0 && (
          <div className="filter-pills-bar">
            <span className="label">Active Filters:</span>
            {activeFilters.map(f => (
              <span className="pill" key={f.key}>
                {f.label}: <b>{f.value}</b>
                <button onClick={() => upd(f.key, 'All')} title={`Remove ${f.label} filter`}>
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              onClick={resetAllFilters}
              className="text-[10px] text-[#ff8bbd] underline hover:text-white font-mono ml-auto cursor-pointer"
            >
              Clear All ({activeFilters.length})
            </button>
          </div>
        )}
      </div>

      {/* MAIN FEATURE: TABLEAU-STYLE ANALYSIS TOOLS PANEL */}
      <div id="workbench" className="tableau-shelf-wrap">
        <DataAnalysisToolsPanel
          allMissions={rows}
          filteredMissions={filtered}
          rawDatasets={rawDatasets}
          filters={filters}
          onUpdateFilter={upd}
          onResetFilters={resetAllFilters}
          onApplyJoin={(joinedRows, summary) => {
            setRows(joinedRows);
          }}
          onResetJoin={() => {
            setRows(defaultRows);
          }}
          marksConfig={marksConfig}
          onUpdateMarks={cfg => setMarksConfig(c => ({ ...c, ...cfg }))}
          groupingConfig={groupingConfig}
          onUpdateGrouping={cfg => setGroupingConfig(c => ({ ...c, ...cfg }))}
          parameterConfig={parameterConfig}
          onUpdateParameter={cfg => setParameterConfig(c => ({ ...c, ...cfg }))}
          hierarchyState={hierarchyState}
          onUpdateHierarchy={cfg => setHierarchyState(c => ({ ...c, ...cfg }))}
          analyticsConfig={analyticsConfig}
          onUpdateAnalytics={cfg => setAnalyticsConfig(c => ({ ...c, ...cfg }))}
          actionConfig={actionConfig}
          onUpdateActions={cfg => setActionConfig(c => ({ ...c, ...cfg }))}
          activeMetric={activeMetric}
          onSelectMetric={setActiveMetric}
        />
      </div>

      {/* DYNAMIC SHOW ME VISUALIZATION STAGE (If Show Me or Chart selector active) */}
      <div className="tableau-shelf-wrap mb-4">
        <Panel
          title={`SHOW ME ANALYSIS STAGE · ${parameterConfig.activeVisualization.toUpperCase()} VIEW`}
          wide
          badge={`Encoding: ${parameterConfig.activeVisualization} | Metric: ${activeMetric}`}
          bgImage="/images/hero_space_earth.jpg"
        >
          <p className="caption">
            Interactive analysis canvas reflecting your Tableau Show Me chart selection, marks encoding, and active metric.
          </p>
          <Chart height={340} option={dynamicShowMeOption} />
        </Panel>
      </div>

      {/* Tableau Dimensions & Measures Schema Shelf */}
      <div className="tableau-shelf-wrap">
        <TableauShelf missions={filtered} />
      </div>

      {/* KPI Cards Row with Calculation Methodology Tooltips */}
      <div id="dashboard" className="kpis">
        {kpis.map(([name, value, Icon, formula]: any) => (
          <div className="kpi group" key={name}>
            <Icon size={17} />
            <span>{name}</span>
            <strong>{value}</strong>
            <small className="formula">{formula}</small>
          </div>
        ))}
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid">
        {/* A. Line Chart — Missions Over Time (With Forecast & Reference Lines) */}
        <Panel
          title="MISSION VELOCITY · TEMPORAL EVOLUTION"
          wide
          badge={hierarchyState.timeLevel === 'decade' ? 'Decade Rollup' : hierarchyState.timeLevel === 'month' ? 'Monthly Seasonality' : 'Annual Trend'}
          bgImage="/images/launch_night_gantry.jpg"
          tools={
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Reference line selector */}
              <div className="flex items-center gap-1 bg-[rgba(14,26,53,0.6)] p-0.5 rounded-md border border-[rgba(181,210,255,0.15)] text-[10px] font-mono">
                <span className="text-[#9ba9c9] px-1">Ref:</span>
                {(['none', 'average', 'median'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setAnalyticsConfig(c => ({ ...c, refLineMode: mode }))}
                    className={`tab-btn ${analyticsConfig.refLineMode === mode ? 'active' : ''}`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>

              {/* Forecast Toggle */}
              <button
                onClick={() => setAnalyticsConfig(c => ({ ...c, enableForecast: !c.enableForecast }))}
                className={`tab-btn ${analyticsConfig.enableForecast ? 'active' : ''}`}
                title="5-Year Exponential Projection"
              >
                <TrendingUp size={11} className="inline mr-1" />
                {analyticsConfig.enableForecast ? 'Forecast: ON' : '+ 5Y Forecast'}
              </button>
            </div>
          }
        >
          <p className="caption">
            Launch trajectories and successful insertions. Reference lines indicate historical central tendencies.
            {analyticsConfig.enableForecast && (
              <span className="text-[#ffbf69] block font-mono text-[10px] mt-1">
                * Note: Forecast lines and confidence intervals are statistical estimates based on historical damped trend.
              </span>
            )}
          </p>

          <Chart
            height={340}
            option={
              hierarchyState.timeLevel === 'month'
                ? chartOption(
                    [
                      {
                        name: 'Monthly Missions',
                        type: 'bar',
                        data: monthlySeasonality.map(x => x[1]),
                        itemStyle: { color: '#65d9ff', borderRadius: [6, 6, 0, 0] }
                      },
                      {
                        name: 'Successful',
                        type: 'line',
                        smooth: true,
                        data: monthlySeasonality.map(x => x[2]),
                        lineStyle: { color: '#5ee5ad', width: 3 }
                      }
                    ],
                    monthlySeasonality.map(x => x[0]),
                    'Launches'
                  )
                : chartOption(
                    [
                      {
                        name: 'All Missions',
                        type: 'line',
                        smooth: true,
                        data: annual.map(x => x[1]),
                        areaStyle: { color: 'rgba(101,217,255,.12)' },
                        lineStyle: { color: '#65d9ff', width: 3 },
                        symbolSize: 6,
                        markLine: referenceMarkLine
                      },
                      {
                        name: 'Successful Launches',
                        type: 'line',
                        smooth: true,
                        data: annual.map(x => x[2]),
                        lineStyle: { color: '#a98bff', width: 2 }
                      },
                      ...(analyticsConfig.enableForecast && forecastData.length
                        ? [
                            {
                              name: '5Y Forecast',
                              type: 'line',
                              data: [
                                ...Array(annual.length - 1).fill(null),
                                annual[annual.length - 1][1],
                                ...forecastData.map(f => f.forecast)
                              ],
                              lineStyle: { color: '#ffbf69', type: 'dashed' as const, width: 2 },
                              itemStyle: { color: '#ffbf69' }
                            },
                            {
                              name: 'Confidence Range',
                              type: 'line',
                              data: [
                                ...Array(annual.length - 1).fill(null),
                                annual[annual.length - 1][1],
                                ...forecastData.map(f => f.upper)
                              ],
                              lineStyle: { opacity: 0 },
                              areaStyle: { color: 'rgba(255, 191, 105, 0.15)' },
                              stack: 'confidence-band',
                              symbol: 'none'
                            }
                          ]
                        : [])
                    ],
                    [
                      ...annual.map(x => String(x[0])),
                      ...(analyticsConfig.enableForecast ? forecastData.map(f => String(f.year)) : [])
                    ],
                    'Launches'
                  )
            }
          />
        </Panel>

        {/* C. Mission Status Distribution (Donut Chart) */}
        <Panel title="MISSION STATUS DISTRIBUTION" badge="Outcome Breakdown">
          <p className="caption">Categorical mission health. Click any slice to cross-filter all visualizations.</p>
          <Chart
            height={310}
            option={{
              tooltip: {
                trigger: 'item',
                formatter: (p: any) =>
                  `<b>${p.name}</b><br/>Missions: <b>${p.value}</b> (${p.percent}%)`
              },
              legend: { bottom: 0, textStyle: { color: '#9ba9c9', fontSize: 11 } },
              series: [
                {
                  type: 'pie',
                  radius: ['45%', '72%'],
                  avoidLabelOverlap: false,
                  itemStyle: { borderRadius: 6, borderColor: '#0b1633', borderWidth: 2 },
                  data: outcomes.map(([name, value], i) => ({
                    name,
                    value,
                    itemStyle: { color: palette[i % palette.length] }
                  })),
                  label: {
                    show: marksConfig.showLabels,
                    formatter: '{b}: {d}%',
                    color: '#cfd8ed',
                    fontSize: 10
                  }
                }
              ]
            }}
            onClick={v => upd('outcome', v)}
          />
        </Panel>

        {/* D. Interactive World Map Section (With Provided World Map Image Integration) */}
        <div id="geography" className="wide">
          <Panel title="GEOGRAPHIC ANALYSIS · GLOBAL LAUNCH NETWORK" wide badge="World Map Reference & Spaceports">
            <p className="caption">
              Cleanly integrated world map reference layer alongside interactive country mission density highlights and spaceport beacons. Hover to view country names and launch counts, or click to filter.
            </p>
            <WorldMap
              missions={filtered}
              selectedCountry={filters.country}
              selectedSite={filters.site}
              onSelectCountry={c => upd('country', c)}
              onSelectSite={s => upd('site', s)}
            />
          </Panel>
        </div>

        {/* B. Bar Chart — Missions by Country (With Tableau Sorting & Top-N) */}
        <Panel
          title="COUNTRY LAUNCH ACTIVITY"
          tools={
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-0.5 bg-[rgba(14,26,53,0.6)] p-0.5 rounded-md border border-[rgba(181,210,255,0.15)] text-[10px]">
                <button
                  onClick={() => setCountrySort('desc')}
                  className={`tab-btn ${countrySort === 'desc' ? 'active' : ''}`}
                >
                  High
                </button>
                <button
                  onClick={() => setCountrySort('asc')}
                  className={`tab-btn ${countrySort === 'asc' ? 'active' : ''}`}
                >
                  Low
                </button>
                <button
                  onClick={() => setCountrySort('alpha')}
                  className={`tab-btn ${countrySort === 'alpha' ? 'active' : ''}`}
                >
                  A–Z
                </button>
              </div>

              <div className="flex items-center gap-0.5 bg-[rgba(14,26,53,0.6)] p-0.5 rounded-md border border-[rgba(181,210,255,0.15)] text-[10px]">
                {[5, 10, 'all'].map((n: any) => (
                  <button
                    key={n}
                    onClick={() => setCountryTopN(n)}
                    className={`tab-btn ${countryTopN === n ? 'active' : ''}`}
                  >
                    {n === 'all' ? 'All' : `Top ${n}`}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <p className="caption">
            Launches per sovereign jurisdiction ({sortedCountries.length} countries displayed). Click a bar to filter.
          </p>
          <Chart
            height={360}
            option={
              chartOption(
                [
                  {
                    type: 'bar',
                    data: sortedCountries.map(([, v]) => v),
                    itemStyle: { color: '#5ee5ad', borderRadius: [0, 8, 8, 0] },
                    label: { show: marksConfig.showLabels, position: 'right', color: '#cfd8ed', fontSize: 10 }
                  }
                ],
                undefined,
                undefined,
                {
                  yAxis: {
                    type: 'category',
                    data: sortedCountries.map(x => x[0]),
                    axisLabel: { color: '#9ba9c9', fontSize: 11 }
                  }
                }
              ) as any
            }
            onClick={v => upd('country', v)}
          />
        </Panel>

        {/* Top Space Organizations */}
        <Panel
          title="TOP SPACE ORGANIZATIONS"
          bgImage="/images/launch_day_shuttle.jpg"
          tools={
            <div className="tools">
              <span>Top</span>
              {[5, 10, 20].map(n => (
                <button
                  className={topN === n ? 'active' : ''}
                  onClick={() => setTopN(n as any)}
                  key={n}
                >
                  {n}
                </button>
              ))}
            </div>
          }
        >
          <p className="caption">Primary space launch providers and national agencies. Click to filter.</p>
          <Chart
            height={360}
            option={
              chartOption(
                [
                  {
                    type: 'bar',
                    data: orgs.slice(0, topN).map(([, v]) => v),
                    itemStyle: { color: '#8b7cff', borderRadius: [0, 8, 8, 0] },
                    label: { show: marksConfig.showLabels, position: 'right', color: '#cfd8ed', fontSize: 10 }
                  }
                ],
                undefined,
                undefined,
                {
                  yAxis: {
                    type: 'category',
                    data: orgs.slice(0, topN).map(x => x[0]),
                    axisLabel: { color: '#9ba9c9', fontSize: 10 }
                  }
                }
              ) as any
            }
            onClick={v => upd('company', v)}
          />
        </Panel>

        {/* Outcomes Over Time (Stacked Area) */}
        <Panel
          title="OUTCOMES OVER TIME · STACKED VOLUME"
          wide
          bgImage="/images/trajectory_star_trail.jpg"
        >
          <p className="caption">Cumulative outcome volume stacked by year to illustrate reliability maturation.</p>
          <Chart
            height={320}
            option={chartOption(
              outcomes.map(([o], i) => ({
                name: o,
                type: 'line',
                stack: 'all',
                areaStyle: { opacity: 0.28 },
                data: annual.map(([y]) => filtered.filter(r => r.year === y && r.outcome === o).length),
                lineStyle: { color: palette[i % palette.length], width: 1.5 },
                itemStyle: { color: palette[i % palette.length] }
              })),
              annual.map(x => String(x[0])),
              'Missions'
            )}
          />
        </Panel>

        {/* Organization Success Breakdown */}
        <Panel title="ORGANIZATION RELIABILITY RATIO">
          <p className="caption">Success vs Other outcomes across the top 8 providers.</p>
          <Chart
            height={320}
            option={chartOption(
              [
                {
                  name: 'Success',
                  type: 'bar',
                  stack: 'x',
                  data: orgs.slice(0, 8).map(([n]) => filtered.filter(r => r.company === n && isSuccess(r.outcome)).length),
                  itemStyle: { color: '#65d9ff' }
                },
                {
                  name: 'Other',
                  type: 'bar',
                  stack: 'x',
                  data: orgs.slice(0, 8).map(([n, v]) => v - filtered.filter(r => r.company === n && isSuccess(r.outcome)).length),
                  itemStyle: { color: '#ff8bbd' }
                }
              ],
              orgs.slice(0, 8).map(x => x[0]),
              'Missions'
            )}
            onClick={v => upd('company', v)}
          />
        </Panel>

        {/* E. Treemap — Organizations or Companies */}
        <Panel title="ORGANIZATION SHARE · TREEMAP" wide badge="Market Share Distribution">
          <p className="caption">Hierarchical view of launch volume across organizations. Click any block to filter.</p>
          <Chart
            height={340}
            option={{
              tooltip: { formatter: '{b}: <b>{c}</b> missions' },
              series: [
                {
                  type: 'treemap',
                  roam: false,
                  breadcrumb: { show: false },
                  label: { show: marksConfig.showLabels, formatter: '{b}\n{c}', color: '#fff', fontSize: 11 },
                  itemStyle: { gapWidth: 2, borderColor: '#071025', borderWidth: 1 },
                  data: orgs.slice(0, 22).map(([name, value], i) => ({
                    name,
                    value,
                    itemStyle: { color: palette[i % palette.length] }
                  }))
                }
              ]
            }}
            onClick={v => upd('company', v)}
          />
        </Panel>

        {/* F. Heat Map Panel (Multidimensional Modes) */}
        <Panel
          title="HEAT MAP · ACTIVITY DENSITY"
          wide
          badge={heatmapMode.toUpperCase().replace('-', ' × ')}
          tools={
            <div className="flex items-center gap-1 bg-[rgba(14,26,53,0.6)] p-0.5 rounded-md border border-[rgba(181,210,255,0.15)] text-[10px] font-mono">
              <button
                onClick={() => setHeatmapMode('country-year')}
                className={`tab-btn ${heatmapMode === 'country-year' ? 'active' : ''}`}
              >
                Country × Year
              </button>
              <button
                onClick={() => setHeatmapMode('org-year')}
                className={`tab-btn ${heatmapMode === 'org-year' ? 'active' : ''}`}
              >
                Organization × Year
              </button>
              <button
                onClick={() => setHeatmapMode('month-year')}
                className={`tab-btn ${heatmapMode === 'month-year' ? 'active' : ''}`}
              >
                Month × Year
              </button>
            </div>
          }
        >
          <p className="caption">
            Launch intensity matrix showing clustering patterns. Select a cell to cross-filter.
          </p>
          <Chart
            height={380}
            option={{
              tooltip: {
                position: 'top',
                formatter: (p: any) =>
                  `Dimension: <b>${p.name}</b><br/>Year/Month: <b>${p.seriesName || ''}</b><br/>Launches: <b>${p.value[2]}</b>`
              },
              grid: { left: 110, right: 30, top: 25, bottom: 60 },
              xAxis: {
                type: 'category',
                data: annual.map(x => String(x[0])),
                axisLabel: { color: '#9ba9c9', fontSize: 10 }
              },
              yAxis: {
                type: 'category',
                data:
                  heatmapMode === 'country-year'
                    ? locations.slice(0, 12).map(x => x[0])
                    : heatmapMode === 'org-year'
                    ? orgs.slice(0, 12).map(x => x[0])
                    : [...MONTH_NAMES],
                axisLabel: { color: '#9ba9c9', fontSize: 10 }
              },
              visualMap: {
                min: 0,
                max: Math.max(1, ...locations.map(([, v]) => v)),
                orient: 'horizontal',
                bottom: 0,
                left: 'center',
                textStyle: { color: '#9ba9c9', fontSize: 10 },
                inRange: { color: ['#13244d', '#2b65a4', '#55b3ff', '#a8efff'] }
              },
              series: [
                {
                  type: 'heatmap',
                  data:
                    heatmapMode === 'country-year'
                      ? locations.slice(0, 12).flatMap(([c], yi) =>
                          annual.map(([y], xi) => [
                            xi,
                            yi,
                            filtered.filter(r => r.country === c && r.year === y).length
                          ])
                        )
                      : heatmapMode === 'org-year'
                      ? orgs.slice(0, 12).flatMap(([o], yi) =>
                          annual.map(([y], xi) => [
                            xi,
                            yi,
                            filtered.filter(r => r.company === o && r.year === y).length
                          ])
                        )
                      : MONTH_NAMES.flatMap((m, yi) =>
                          annual.map(([y], xi) => [
                            xi,
                            yi,
                            filtered.filter(r => r.month === m && r.year === y).length
                          ])
                        )
                }
              ]
            }}
            onClick={v => {
              if (heatmapMode === 'country-year') upd('country', v);
              else if (heatmapMode === 'org-year') upd('company', v);
            }}
          />
        </Panel>

        {/* ADVANCED TABLEAU ANALYTICAL SUITE */}
        <div id="analytics" className="wide">
          <div className="flex items-center gap-2 mb-3 mt-4">
            <Sliders className="text-[#65d9ff]" size={18} />
            <span className="font-mono text-xs uppercase tracking-wider text-[#65d9ff] font-bold">
              Advanced Analytical Features · Distribution & Relationships
            </span>
          </div>
        </div>

        {/* G. Histogram (Payloads or Mission Cost with Bin Controls) */}
        <Panel
          title="DISTRIBUTION HISTOGRAM"
          badge={histogramMode === 'payloads' ? 'Payloads Frequency' : 'Mission Cost ($M)'}
          bgImage="/images/satellite_orbit.jpg"
          tools={
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-[rgba(14,26,53,0.6)] p-0.5 rounded-md border border-[rgba(181,210,255,0.15)] text-[10px] font-mono">
                <button
                  onClick={() => setHistogramMode('payloads')}
                  className={`tab-btn ${histogramMode === 'payloads' ? 'active' : ''}`}
                >
                  Payloads
                </button>
                <button
                  onClick={() => setHistogramMode('cost')}
                  className={`tab-btn ${histogramMode === 'cost' ? 'active' : ''}`}
                >
                  Cost ($M)
                </button>
              </div>

              <div className="flex items-center gap-1 bg-[rgba(14,26,53,0.6)] p-0.5 rounded-md border border-[rgba(181,210,255,0.15)] text-[10px] font-mono">
                <span className="text-[#9ba9c9] px-1">Bins:</span>
                {[6, 8, 12].map((b: any) => (
                  <button
                    key={b}
                    onClick={() => setHistogramBinsCount(b)}
                    className={`tab-btn ${histogramBinsCount === b ? 'active' : ''}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <p className="caption">
            {histogramMode === 'payloads'
              ? 'Frequency distribution of catalogued satellite payloads per orbital launch event.'
              : 'Statistical frequency distribution of recorded launch vehicle costs in millions of USD.'}
          </p>
          <Chart
            height={320}
            option={chartOption(
              [
                {
                  type: 'bar',
                  data: (histogramMode === 'payloads' ? payloadBins : costBins).map(b => b.count),
                  itemStyle: {
                    color: histogramMode === 'payloads' ? '#ffbf69' : '#5ee5ad',
                    borderRadius: [6, 6, 0, 0]
                  },
                  label: { show: marksConfig.showLabels, position: 'top', color: '#cfd8ed', fontSize: 10 }
                }
              ],
              (histogramMode === 'payloads' ? payloadBins : costBins).map(b => b.label),
              'Frequency (Count)'
            )}
          />
        </Panel>

        {/* H. Box Plot — Mission Cost Distribution by Country or Org */}
        <Panel
          title="MISSION COST DISPERSION · BOX PLOT"
          badge="Five-Number Summary"
          tools={
            <div className="flex items-center gap-1 bg-[rgba(14,26,53,0.6)] p-0.5 rounded-md border border-[rgba(181,210,255,0.15)] text-[10px] font-mono">
              <span className="text-[#9ba9c9] px-1">Group By:</span>
              <button
                onClick={() => setBoxPlotCategory('country')}
                className={`tab-btn ${boxPlotCategory === 'country' ? 'active' : ''}`}
              >
                Country
              </button>
              <button
                onClick={() => setBoxPlotCategory('company')}
                className={`tab-btn ${boxPlotCategory === 'company' ? 'active' : ''}`}
              >
                Organization
              </button>
            </div>
          }
        >
          <p className="caption">
            Quartiles (Q1, Median, Q3), whiskers (1.5×IQR fences), and statistical outliers for launch budgets ($M).
          </p>
          {boxPlotStats.length > 0 ? (
            <Chart
              height={320}
              option={{
                tooltip: {
                  trigger: 'item',
                  formatter: (p: any) => {
                    const st = boxPlotStats.find(s => s.name === p.name);
                    if (!st) return '';
                    return `<b>${st.name}</b><br/>Max Whisker: $${st.max}M<br/>Q3 (75%): $${st.q3}M<br/>Median: <b>$${st.median}M</b><br/>Q1 (25%): $${st.q1}M<br/>Min Whisker: $${st.min}M<br/>Avg Cost: $${st.avg}M (${st.count} missions)`;
                  }
                },
                grid: { left: 55, right: 25, top: 25, bottom: 40 },
                xAxis: {
                  type: 'category',
                  data: boxPlotStats.map(s => s.name),
                  axisLabel: { color: '#9ba9c9', fontSize: 10 }
                },
                yAxis: {
                  type: 'value',
                  name: 'Cost ($M)',
                  nameTextStyle: { color: '#9ba9c9', fontSize: 10 },
                  splitLine: { lineStyle: { color: 'rgba(146,170,220,.12)' } },
                  axisLabel: { color: '#9ba9c9', fontSize: 10 }
                },
                series: [
                  {
                    name: 'Cost Distribution',
                    type: 'boxplot',
                    data: boxPlotStats.map(s => [s.min, s.q1, s.median, s.q3, s.max]),
                    itemStyle: {
                      borderColor: '#65d9ff',
                      color: 'rgba(101,217,255,0.18)'
                    }
                  }
                ]
              }}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-xs text-[#9ba9c9] font-mono">
              Insufficient cost records matching the selected filter criteria to compute 5-number box plots.
            </div>
          )}
        </Panel>

        {/* I. Scatter Plot — Numerical Variables (Cost vs Payloads) with Trend Line */}
        <Panel
          title="COST VS PAYLOAD SCALE · SCATTER PLOT"
          wide
          badge={analyticsConfig.enableClustering ? 'Clustering Active' : 'Regression Analysis'}
          tools={
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAnalyticsConfig(c => ({ ...c, enableTrendLine: !c.enableTrendLine }))}
                className={`tab-btn ${analyticsConfig.enableTrendLine ? 'active' : ''}`}
              >
                <TrendingUp size={11} className="inline mr-1" />
                {analyticsConfig.enableTrendLine ? 'Trend: ON' : '+ Trend Line'}
              </button>
              <button
                onClick={() => setAnalyticsConfig(c => ({ ...c, enableClustering: !c.enableClustering }))}
                className={`tab-btn ${analyticsConfig.enableClustering ? 'active' : ''}`}
              >
                {analyticsConfig.enableClustering ? 'Clusters: ON' : '+ Clustering'}
              </button>
            </div>
          }
        >
          <p className="caption">
            Bivariate relationship between launch vehicle cost ($M) and payload scale. Trend line computed via Ordinary Least Squares (OLS) regression.
          </p>
          {scatterData.points.length > 0 ? (
            <Chart
              height={340}
              option={{
                tooltip: {
                  trigger: 'item',
                  formatter: (p: any) => {
                    const raw = p.data;
                    return `<b>${raw[3] || 'Mission'}</b><br/>Provider: ${raw[4]}<br/>Payloads: <b>${raw[0]}</b><br/>Cost: <b>$${raw[1]}M</b><br/>Outcome: ${raw[5]}`;
                  }
                },
                grid: { left: 55, right: 35, top: 25, bottom: 45 },
                xAxis: {
                  type: 'value',
                  name: 'Payload Count',
                  nameTextStyle: { color: '#9ba9c9', fontSize: 10 },
                  axisLabel: { color: '#9ba9c9', fontSize: 10 },
                  splitLine: { lineStyle: { color: 'rgba(146,170,220,.12)' } }
                },
                yAxis: {
                  type: 'value',
                  name: 'Cost ($M)',
                  nameTextStyle: { color: '#9ba9c9', fontSize: 10 },
                  axisLabel: { color: '#9ba9c9', fontSize: 10 },
                  splitLine: { lineStyle: { color: 'rgba(146,170,220,.12)' } }
                },
                series: [
                  {
                    name: 'Missions',
                    type: 'scatter' as const,
                    symbolSize: 8,
                    itemStyle: { color: '#df7cff', opacity: 0.8 },
                    data: scatterData.points.map(p => [p.payloads, p.cost, p.year, p.name, p.company, p.outcome])
                  },
                  ...(analyticsConfig.enableTrendLine && scatterData.trendLine.length
                    ? [
                        {
                          name: 'Linear Trend Line',
                          type: 'line' as const,
                          showSymbol: false,
                          data: scatterData.trendLine,
                          lineStyle: { color: '#65d9ff', width: 2, type: 'dashed' as const }
                        }
                      ]
                    : [])
                ]
              }}
            />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-xs text-[#9ba9c9] font-mono">
              No numerical cost points available under the current active filter set.
            </div>
          )}
        </Panel>

        {/* 15. DATA STORY & KEY INSIGHTS */}
        <Panel title="DATA STORY · SYNTHESIZED EXECUTIVE INSIGHTS" wide badge="Automated Findings">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#091530] border border-[rgba(181,210,255,0.12)]">
              <span className="text-[10px] font-mono text-[#9ba9c9] uppercase block mb-1">
                Dominant Spacefaring State
              </span>
              <strong className="text-base text-[#65d9ff] block mb-1">
                {locations[0]?.[0] || '—'}
              </strong>
              <small className="text-[10px] text-[#9ba9c9] leading-tight block">
                Responsible for {locations[0]?.[1] || 0} missions (
                {filtered.length ? (((locations[0]?.[1] || 0) / filtered.length) * 100).toFixed(1) : 0}
                % of active filter volume).
              </small>
            </div>

            <div className="p-3.5 rounded-xl bg-[#091530] border border-[rgba(181,210,255,0.12)]">
              <span className="text-[10px] font-mono text-[#9ba9c9] uppercase block mb-1">
                Historical Peak Year
              </span>
              <strong className="text-base text-[#ffbf69] block mb-1">
                {annual.reduce((best, row) => (row[1] > best[1] ? row : best), annual[0] || [0, 0])[0] || '—'}
              </strong>
              <small className="text-[10px] text-[#9ba9c9] leading-tight block">
                Recorded {annual.reduce((best, row) => (row[1] > best[1] ? row : best), annual[0] || [0, 0])[1] || 0} orbital launches in a single calendar year.
              </small>
            </div>

            <div className="p-3.5 rounded-xl bg-[#091530] border border-[rgba(181,210,255,0.12)]">
              <span className="text-[10px] font-mono text-[#9ba9c9] uppercase block mb-1">
                Leading Launch Provider
              </span>
              <strong className="text-base text-[#a98bff] block mb-1">
                {orgs[0]?.[0] || '—'}
              </strong>
              <small className="text-[10px] text-[#9ba9c9] leading-tight block">
                Maintains highest cadence with {orgs[0]?.[1] || 0} missions conducted.
              </small>
            </div>

            <div className="p-3.5 rounded-xl bg-[#091530] border border-[rgba(181,210,255,0.12)]">
              <span className="text-[10px] font-mono text-[#9ba9c9] uppercase block mb-1">
                Program Reliability
              </span>
              <strong className="text-base text-[#5ee5ad] block mb-1">
                {filtered.length ? `${((success / filtered.length) * 100).toFixed(1)}%` : '—'}
              </strong>
              <small className="text-[10px] text-[#9ba9c9] leading-tight block">
                {success.toLocaleString()} successful flights out of {filtered.length.toLocaleString()} total logged events.
              </small>
            </div>
          </div>

          {/* Statistical Outlier Highlights */}
          {costOutliers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[rgba(181,210,255,0.12)]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#df7cff] font-semibold block mb-2">
                Statistical Cost Outliers Detected (Upper IQR Fence: High-Budget Launches)
              </span>
              <div className="flex flex-wrap gap-2">
                {costOutliers.map((o, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-[#14234d] border border-[#df7cff]/30 text-[#e2ecff] flex items-center gap-2"
                  >
                    <span className="text-[#65d9ff] font-semibold">{o.company}</span>
                    <span>{o.rocket}</span>
                    <strong className="text-[#ffbf69]">${o.cost}M</strong>
                    <span className="text-[9px] text-[#9ba9c9]">({o.year})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Complete Filtered Mission Log Explorer */}
      <section id="explore" className="table-panel">
        <div>
          <p className="panel-title">COMPLETE FILTERED MISSION LOG</p>
          <p className="caption">
            {filtered.length.toLocaleString()} records · searchable, multi-column sorted, and exportable
          </p>
        </div>

        <div className="table-tools">
          <label>
            <Search size={15} />
            <input
              placeholder="Search missions, rockets, sites..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <select value={sort} onChange={e => setSort(e.target.value as any)}>
            <option value="year">Sort by Year</option>
            <option value="company">Sort by Organization</option>
            <option value="outcome">Sort by Outcome</option>
            <option value="cost">Sort by Cost ($M)</option>
          </select>
          <button onClick={download}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  'Organization',
                  'Date',
                  'Country',
                  'Region',
                  'Launch Site',
                  'Mission Detail',
                  'Outcome',
                  'Rocket Status',
                  'Cost ($M)'
                ].map(x => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table
                .filter(r => JSON.stringify(r.raw).toLowerCase().includes(search.toLowerCase()))
                .slice(page * 12, page * 12 + 12)
                .map((r, i) => (
                  <tr key={i}>
                    <td>
                      <b>{r.company}</b>
                    </td>
                    <td>{r.date?.toLocaleDateString() || (r.year ? String(r.year) : '—')}</td>
                    <td>{r.country}</td>
                    <td>
                      <span className="text-[10px] text-[#9ba9c9]">{r.region}</span>
                    </td>
                    <td>{r.site}</td>
                    <td>{r.detail || '—'}</td>
                    <td>
                      <mark className={isSuccess(r.outcome) ? 'good' : isFailure(r.outcome) ? 'bad' : ''}>
                        {r.outcome}
                      </mark>
                    </td>
                    <td>{r.rocketStatus}</td>
                    <td>{r.cost !== null ? <b className="text-[#ffbf69]">${r.cost}M</b> : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="pager">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 12))}
          </span>
          <button disabled={(page + 1) * 12 >= filtered.length} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      </section>

      {/* Data Validation & Schema Relationships Modal */}
      <DataHealthModal
        report={dataReport}
        isOpen={isDataHealthOpen}
        onClose={() => setIsDataHealthOpen(false)}
      />

      <footer>
        ORBITAL ATLAS · TABLEAU DATA ANALYSIS PLATFORM · {rows.length.toLocaleString()} LOADED & JOINED RECORDS
      </footer>
    </main>
  );
}
