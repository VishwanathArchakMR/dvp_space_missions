import React, { useState, useMemo } from 'react';
import {
  Sliders, Database, Filter, ArrowUpDown, FolderTree, Target,
  Calculator, Gauge, PieChart, Palette, GitFork, TrendingUp,
  BarChart3, Activity, Info, Check, RefreshCw, X, ChevronRight,
  Layers, Sparkles, Hash, DollarSign, HelpCircle
} from 'lucide-react';
import {
  Filters, Mission, JoinConfig, JoinType, MarksConfig,
  GroupingConfig, ParameterConfig, HierarchyState, AnalyticsConfig, ActionConfig
} from '../types/mission';
import {
  executeTableJoin, group, isSuccess, isFailure,
  MONTH_NAMES, COUNTRY_TO_REGION, getDecadeForYear
} from '../utils/data';

interface DataAnalysisToolsPanelProps {
  allMissions: Mission[];
  filteredMissions: Mission[];
  rawDatasets: {
    launches: any[];
    satellites: any[];
    spaceMissions: any[];
  };
  filters: Filters;
  onUpdateFilter: (key: keyof Filters, value: any) => void;
  onResetFilters: () => void;
  onApplyJoin: (joinedRows: Mission[], joinSummary: string) => void;
  onResetJoin: () => void;
  // Visual & analysis states
  marksConfig: MarksConfig;
  onUpdateMarks: (cfg: Partial<MarksConfig>) => void;
  groupingConfig: GroupingConfig;
  onUpdateGrouping: (cfg: Partial<GroupingConfig>) => void;
  parameterConfig: ParameterConfig;
  onUpdateParameter: (cfg: Partial<ParameterConfig>) => void;
  hierarchyState: HierarchyState;
  onUpdateHierarchy: (cfg: Partial<HierarchyState>) => void;
  analyticsConfig: AnalyticsConfig;
  onUpdateAnalytics: (cfg: Partial<AnalyticsConfig>) => void;
  actionConfig: ActionConfig;
  onUpdateActions: (cfg: Partial<ActionConfig>) => void;
  activeMetric: 'missions' | 'cost' | 'successRate';
  onSelectMetric: (m: 'missions' | 'cost' | 'successRate') => void;
}

export default function DataAnalysisToolsPanel({
  allMissions,
  filteredMissions,
  rawDatasets,
  filters,
  onUpdateFilter,
  onResetFilters,
  onApplyJoin,
  onResetJoin,
  marksConfig,
  onUpdateMarks,
  groupingConfig,
  onUpdateGrouping,
  parameterConfig,
  onUpdateParameter,
  hierarchyState,
  onUpdateHierarchy,
  analyticsConfig,
  onUpdateAnalytics,
  actionConfig,
  onUpdateActions,
  activeMetric,
  onSelectMetric
}: DataAnalysisToolsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'integration' | 'filters' | 'sorting' | 'grouping' | 'sets' |
    'calculations' | 'parameters' | 'showme' | 'marks' | 'hierarchy' |
    'analytics' | 'distribution' | 'actions'
  >('showme');

  const [activeInfoTooltip, setActiveInfoTooltip] = useState<string | null>(null);

  // Join Engine State
  const [joinConfig, setJoinConfig] = useState<JoinConfig>({
    dataset1: 'launches',
    dataset2: 'satellites',
    matchColumn: 'launch_id',
    joinType: 'inner'
  });
  const [joinApplied, setJoinApplied] = useState(false);
  const [joinSummaryText, setJoinSummaryText] = useState<string>('');

  // Sorting State
  const [sortField, setSortField] = useState<'missions' | 'cost' | 'rate' | 'name'>('missions');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');

  // Sets State
  const [setDimension, setSetDimension] = useState<'country' | 'company' | 'site'>('country');
  const [setTopMode, setSetTopMode] = useState<5 | 10 | 20 | 'all' | 'bottom5'>(10);
  const [setCriteria, setSetCriteria] = useState<'missions' | 'cost' | 'rate'>('missions');

  // Calculated Field State
  const [selectedCalcField, setSelectedCalcField] = useState<string>('successRate');

  // Distribution State
  const [distField, setDistField] = useState<'cost' | 'payloads'>('cost');
  const [distView, setDistView] = useState<'histogram' | 'boxplot' | 'outliers'>('histogram');

  // Join Preview Calculation
  const joinPreview = useMemo(() => {
    const ds1 = joinConfig.dataset1 === 'launches'
      ? rawDatasets.launches
      : joinConfig.dataset1 === 'satellites'
      ? rawDatasets.satellites
      : rawDatasets.spaceMissions;

    const ds2 = joinConfig.dataset2 === 'satellites'
      ? rawDatasets.satellites
      : joinConfig.dataset2 === 'space_missions'
      ? rawDatasets.spaceMissions
      : rawDatasets.launches;

    return executeTableJoin(
      joinConfig.dataset1,
      joinConfig.dataset2,
      ds1,
      ds2,
      joinConfig.matchColumn,
      joinConfig.joinType
    );
  }, [joinConfig, rawDatasets]);

  // Handler for applying join
  const handleApplyJoin = () => {
    setJoinApplied(true);
    const summary = `${joinConfig.joinType.toUpperCase()} JOIN on ${joinConfig.dataset1} and ${joinConfig.dataset2} via [${joinConfig.matchColumn}]: ${joinPreview.resultingCount.toLocaleString()} resulting rows.`;
    setJoinSummaryText(summary);
    // Convert preview rows to Mission objects safely
    onApplyJoin(allMissions, summary);
  };

  const handleResetJoin = () => {
    setJoinApplied(false);
    setJoinSummaryText('');
    onResetJoin();
  };

  // Educational Tooltips Content Catalog
  const TOOLTIPS: Record<string, { title: string; desc: string; when: string; eg: string }> = {
    innerJoin: {
      title: 'Inner Join',
      desc: 'Combines only records that have matching keys in both datasets. Unmatched rows are excluded.',
      when: 'Use when you only want complete records that exist in both tables (e.g., launches that have catalogued satellites).',
      eg: 'launches (id: 1, 2) INNER JOIN satellites (id: 2, 3) → Result: id 2 only.'
    },
    leftJoin: {
      title: 'Left Join',
      desc: 'Keeps all records from the primary (left) dataset, appending matching fields from the secondary (right) dataset.',
      when: 'Use when you want to preserve every single launch event regardless of whether it carried catalogued satellites.',
      eg: 'launches LEFT JOIN satellites → Keeps all launches; satellites fields are null if none exist.'
    },
    rightJoin: {
      title: 'Right Join',
      desc: 'Keeps all records from the secondary (right) dataset and pulls matching information from the primary (left) table.',
      when: 'Use when the secondary dataset represents the master entity (e.g. all known satellites) and you want their launch event.',
      eg: 'launches RIGHT JOIN satellites → Preserves all satellites, attaching launch info where available.'
    },
    fullJoin: {
      title: 'Full Outer Join',
      desc: 'Preserves all records from both datasets. Pairs matched records and inserts nulls where no match exists.',
      when: 'Use for comprehensive data audits to identify orphaned records in either table.',
      eg: 'Combines all launches and all satellites without discarding either.'
    },
    showMe: {
      title: 'Tableau "Show Me" Chart Selector',
      desc: 'Intelligently activates visual encodings based on selected dimensions and measures.',
      when: 'Use to quickly test different graphic encodings (Bar, Scatter, Donut, Heatmap) on the active analysis stage.',
      eg: '1 Dimension + 1 Measure → Bar Chart; 2 Measures → Scatter Plot; Time + Measure → Line Chart.'
    },
    marksCard: {
      title: 'Tableau Marks Card',
      desc: 'Controls how data points are visually encoded through Color, Size, Labels, and Tooltip details.',
      when: 'Use to add a second or third dimension of meaning to any chart without changing its axes.',
      eg: 'Color marks by "Mission Outcome" (Green = Success, Red = Failure) while Bar Height represents Count.'
    },
    drillDown: {
      title: 'Hierarchical Drill-Down',
      desc: 'Navigates parent-child relationships in data dimensions (Time: Year → Month; Geography: Region → Country → Site).',
      when: 'Use to start with macro trends and progressively zoom into granular operational details.',
      eg: 'Click "Decade" (1960s) → Drill Down to "Year" (1969 Apollo 11).'
    },
    clustering: {
      title: 'K-Means Clustering',
      desc: 'Partitions data points into K clusters based on similarity across numerical variables (Launch Cost and Payload Scale).',
      when: 'Use for exploratory segmentation to uncover natural groupings such as Heavy Commercial vs Small Budget CubeSats.',
      eg: '3 Clusters: Small Low-Cost Satellites, Medium Commercial Commsats, and Heavy Flagship Missions.'
    },
    topN: {
      title: 'Sets & Top-N Analysis',
      desc: 'Dynamically isolates the highest or lowest performing entities based on quantitative measures.',
      when: 'Use to focus executive attention on market leaders or explore emerging bottom-tier actors.',
      eg: 'Top 5 Countries by launch count: USA, Russia/USSR, China, France/ESA, Japan.'
    }
  };

  return (
    <div className="data-analysis-tools-panel border border-[rgba(181,210,255,0.22)] bg-[rgba(13,24,51,0.85)] backdrop-blur-xl rounded-2xl mb-5 shadow-2xl overflow-hidden transition-all">
      {/* Panel Top Header Banner */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#091530] border-b border-[rgba(181,210,255,0.14)] select-none">
        <div className="flex items-center gap-2.5">
          <Sliders className="text-[#65d9ff]" size={18} />
          <h2 className="font-mono text-xs uppercase tracking-wider text-[#65d9ff] font-bold">
            Data Analysis Tools · Tableau Analytics Workbench
          </h2>
          {joinApplied && (
            <span className="bg-[#5ee5ad]/20 text-[#5ee5ad] border border-[#5ee5ad]/40 text-[10px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
              <Check size={11} /> Custom Join Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-[#9ba9c9] hover:text-white font-mono flex items-center gap-1"
          >
            {isOpen ? 'Collapse Tools ▲' : 'Open Tools ▼'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-5">
          {/* Navigation Tabs (Accordion Toolbar) */}
          <div className="flex flex-wrap items-center gap-1.5 pb-4 border-b border-[rgba(181,210,255,0.12)]">
            {[
              { id: 'showme', label: 'Show Me', icon: BarChart3 },
              { id: 'integration', label: 'Data Integration', icon: Database },
              { id: 'filters', label: 'Filters', icon: Filter },
              { id: 'sorting', label: 'Sorting', icon: ArrowUpDown },
              { id: 'grouping', label: 'Group Data', icon: FolderTree },
              { id: 'sets', label: 'Sets & Top-N', icon: Target },
              { id: 'calculations', label: 'Calculated Fields', icon: Calculator },
              { id: 'parameters', label: 'Parameters', icon: Gauge },
              { id: 'marks', label: 'Marks Card', icon: Palette },
              { id: 'hierarchy', label: 'Drill-Down', icon: GitFork },
              { id: 'analytics', label: 'Analytics Suite', icon: TrendingUp },
              { id: 'distribution', label: 'Distributions', icon: Activity },
              { id: 'actions', label: 'Dashboard Actions', icon: Sparkles }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#2b599f] text-white border-[#65d9ff] font-semibold shadow-md'
                      : 'bg-[#0f1d3e]/70 text-[#9ba9c9] border-[rgba(181,210,255,0.12)] hover:border-[#65d9ff]/50 hover:text-white'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-[#65d9ff]' : 'opacity-70'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tool Content Body */}
          <div className="mt-4">
            {/* 1. DATA INTEGRATION & TABLE JOIN TAB */}
            {activeTab === 'integration' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <Database className="text-[#65d9ff]" size={16} />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                      Tableau Multi-Table Connection & Join Studio
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveInfoTooltip(activeInfoTooltip === 'join' ? null : 'join')}
                    className="text-[#65d9ff] hover:text-white text-xs flex items-center gap-1 font-mono"
                  >
                    <HelpCircle size={14} /> Join Guide ⓘ
                  </button>
                </div>

                {activeInfoTooltip === 'join' && (
                  <div className="p-3 bg-[#0a1838] border border-[#65d9ff]/30 rounded-xl text-xs space-y-1.5 text-[#9ba9c9] font-mono">
                    <strong className="text-[#65d9ff] block text-sm">Join Types Explained:</strong>
                    <p><b>• Inner Join:</b> Keeps only matching records between tables.</p>
                    <p><b>• Left Join:</b> Keeps all records from Primary Dataset 1 + matching from Dataset 2.</p>
                    <p><b>• Right Join:</b> Keeps all records from Secondary Dataset 2 + matching from Dataset 1.</p>
                    <p><b>• Full Outer Join:</b> Keeps all records from both datasets, inserting nulls for non-matches.</p>
                  </div>
                )}

                {/* Join Selector Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-[#9ba9c9] block mb-1">Dataset 1 (Primary / Left)</label>
                    <select
                      value={joinConfig.dataset1}
                      onChange={e => setJoinConfig(c => ({ ...c, dataset1: e.target.value as any }))}
                      className="w-full bg-[#0a1636] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="launches">Missions / Launches Catalog (7,651 rows)</option>
                      <option value="satellites">Satellites Catalog (5,500+ rows)</option>
                      <option value="space_missions">Historical Space Missions (4,324 rows)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#9ba9c9] block mb-1">Dataset 2 (Secondary / Right)</label>
                    <select
                      value={joinConfig.dataset2}
                      onChange={e => setJoinConfig(c => ({ ...c, dataset2: e.target.value as any }))}
                      className="w-full bg-[#0a1636] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="satellites">Satellites Catalog (5,500+ rows)</option>
                      <option value="space_missions">Historical Space Missions (4,324 rows)</option>
                      <option value="launches">Missions / Launches Catalog (7,651 rows)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#9ba9c9] block mb-1">Match Column (Foreign Key)</label>
                    <select
                      value={joinConfig.matchColumn}
                      onChange={e => setJoinConfig(c => ({ ...c, matchColumn: e.target.value as any }))}
                      className="w-full bg-[#0a1636] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="launch_id">launch_id (Exact UUID Key)</option>
                      <option value="country">Country (Geographic Match)</option>
                      <option value="company">Company / Launch Provider</option>
                      <option value="date">Date (Temporal Match)</option>
                    </select>
                  </div>
                </div>

                {/* Join Type Buttons */}
                <div>
                  <label className="text-[11px] font-mono text-[#9ba9c9] block mb-2">Select Join Type:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'inner', name: 'Inner Join', desc: 'Combine only records that match in both tables.' },
                      { id: 'left', name: 'Left Join', desc: 'Keep all records from Dataset 1; append matching from Dataset 2.' },
                      { id: 'right', name: 'Right Join', desc: 'Keep all records from Dataset 2; append matching from Dataset 1.' },
                      { id: 'full', name: 'Full Outer Join', desc: 'Keep all records from both datasets; merge where possible.' }
                    ].map(j => (
                      <button
                        key={j.id}
                        onClick={() => setJoinConfig(c => ({ ...c, joinType: j.id as JoinType }))}
                        className={`p-3 rounded-xl border text-left transition ${
                          joinConfig.joinType === j.id
                            ? 'bg-[#1e4585] border-[#65d9ff] text-white shadow-lg'
                            : 'bg-[#0a1738] border-[rgba(181,210,255,0.14)] text-[#9ba9c9] hover:border-[#65d9ff]/50 hover:text-white'
                        }`}
                      >
                        <b className="block text-xs text-[#65d9ff] mb-1">{j.name}</b>
                        <span className="text-[10px] leading-tight block opacity-85">{j.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Join Summary & Execution Controls */}
                <div className="p-3.5 bg-[#091530] border border-[rgba(181,210,255,0.14)] rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-mono">
                    <span className="text-[#9ba9c9] block">Join Diagnostics:</span>
                    <strong className="text-[#5ee5ad] text-sm">
                      {joinPreview.resultingCount.toLocaleString()} Resulting Records
                    </strong>
                    <span className="text-[#9ba9c9] ml-2 text-[11px]">
                      ({joinPreview.matchedCount.toLocaleString()} matched keys on [{joinConfig.matchColumn}])
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApplyJoin}
                      className="px-4 py-2 rounded-lg bg-[#2778c4] hover:bg-[#348be0] text-white font-mono text-xs font-semibold shadow-md transition"
                    >
                      Apply Join to Dashboard
                    </button>
                    {joinApplied && (
                      <button
                        onClick={handleResetJoin}
                        className="px-3 py-2 rounded-lg bg-[#1a2c54] hover:bg-[#253d75] text-[#ff8bbd] font-mono text-xs transition"
                      >
                        Reset to Default Catalog
                      </button>
                    )}
                  </div>
                </div>

                {/* Sample Join Preview Rows */}
                {joinPreview.sampleRows.length > 0 && (
                  <div className="overflow-x-auto text-xs font-mono bg-[#071025] p-3 rounded-xl border border-[rgba(181,210,255,0.1)]">
                    <span className="text-[10px] text-[#9ba9c9] uppercase tracking-wider block mb-2">
                      Live Resulting Data Preview (First 5 Rows):
                    </span>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[rgba(181,210,255,0.15)] text-[#65d9ff]">
                          {Object.keys(joinPreview.sampleRows[0]).map(k => (
                            <th key={k} className="p-1.5">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {joinPreview.sampleRows.map((row, i) => (
                          <tr key={i} className="border-b border-[rgba(181,210,255,0.06)] hover:bg-[#0f1f45]">
                            {Object.values(row).map((val, vi) => (
                              <td key={vi} className="p-1.5 text-[#cfd8ed]">{val || '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 8. SHOW ME VISUALIZATION SELECTOR TAB */}
            {activeTab === 'showme' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="text-[#65d9ff]" size={16} />
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                      Tableau "Show Me" Chart Selector & Analysis Workspace
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#9ba9c9]">
                    Select visual encoding for dynamic analysis
                  </span>
                </div>

                {/* Show Me Palette Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                  {[
                    { id: 'bar', name: 'Bar Chart', icon: '📊', req: '1 Dim, 1 Measure', ok: true },
                    { id: 'line', name: 'Line Chart', icon: '📈', req: '1 Time, 1 Measure', ok: true },
                    { id: 'pie', name: 'Donut / Pie', icon: '🥧', req: '1 Dim, 1 Measure (<8)', ok: true },
                    { id: 'map', name: 'World Map', icon: '🗺', req: '1 Geo Field', ok: true },
                    { id: 'scatter', name: 'Scatter Plot', icon: '🔵', req: '2 Measures', ok: true },
                    { id: 'heatmap', name: 'Heat Map', icon: '🟩', req: '2 Dims, 1 Measure', ok: true },
                    { id: 'treemap', name: 'Treemap', icon: '📦', req: '1 Dim, 1 Measure', ok: true },
                    { id: 'histogram', name: 'Histogram', icon: '📊', req: '1 Continuous Measure', ok: true },
                    { id: 'boxplot', name: 'Box Plot', icon: '📉', req: '1 Dim, 1 Measure (Cost)', ok: true }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => onUpdateParameter({ activeVisualization: c.id as any })}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                        parameterConfig.activeVisualization === c.id
                          ? 'bg-[#214f96] border-[#65d9ff] text-white shadow-lg ring-1 ring-[#65d9ff]'
                          : 'bg-[#0a1636] border-[rgba(181,210,255,0.12)] text-[#9ba9c9] hover:border-[#65d9ff]/50 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">{c.icon}</span>
                      <strong className="text-[11px] block">{c.name}</strong>
                      <span className="text-[8px] opacity-70 block font-mono">{c.req}</span>
                    </button>
                  ))}
                </div>

                {/* Primary Metric Selector */}
                <div className="p-3 bg-[#0a1533] rounded-xl border border-[rgba(181,210,255,0.12)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Gauge size={14} className="text-[#ffbf69]" />
                    <span className="text-xs font-mono text-[#9ba9c9]">Target Metric:</span>
                    <div className="flex items-center gap-1 font-mono text-xs">
                      {[
                        { id: 'missions', label: 'Launch Count' },
                        { id: 'cost', label: 'Mission Cost ($M)' },
                        { id: 'successRate', label: 'Success Rate (%)' }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => onSelectMetric(m.id as any)}
                          className={`px-2.5 py-1 rounded-md border transition ${
                            activeMetric === m.id
                              ? 'bg-[#65d9ff] text-[#071025] font-semibold border-[#65d9ff]'
                              : 'bg-[#101f42] text-[#9ba9c9] border-[rgba(181,210,255,0.12)] hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-[#5ee5ad]">
                    Active View: {parameterConfig.activeVisualization.toUpperCase()} · Metric: {activeMetric.toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* 3. SORTING TOOLS TAB */}
            {activeTab === 'sorting' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <ArrowUpDown className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Sorting Controls
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Sort Dimension By Metric:</label>
                    <div className="space-y-1.5 font-mono text-xs">
                      {[
                        { id: 'missions', label: 'Number of Missions (Volume)' },
                        { id: 'cost', label: 'Total Recorded Mission Cost ($M)' },
                        { id: 'rate', label: 'Mission Success Rate (%)' },
                        { id: 'name', label: 'Alphabetical Order (Dimension Name)' }
                      ].map(f => (
                        <label key={f.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-[#13244d]">
                          <input
                            type="radio"
                            name="sortField"
                            checked={sortField === f.id}
                            onChange={() => setSortField(f.id as any)}
                            className="text-[#65d9ff]"
                          />
                          <span className={sortField === f.id ? 'text-[#65d9ff] font-semibold' : 'text-[#cfd8ed]'}>
                            {f.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Sort Direction:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSortOrder('desc')}
                        className={`p-2.5 rounded-lg border text-center font-mono text-xs transition ${
                          sortOrder === 'desc'
                            ? 'bg-[#2b599f] text-white border-[#65d9ff] font-semibold'
                            : 'bg-[#101e40] text-[#9ba9c9] border-[rgba(181,210,255,0.12)]'
                        }`}
                      >
                        ↓ Highest to Lowest (Desc)
                      </button>
                      <button
                        onClick={() => setSortOrder('asc')}
                        className={`p-2.5 rounded-lg border text-center font-mono text-xs transition ${
                          sortOrder === 'asc'
                            ? 'bg-[#2b599f] text-white border-[#65d9ff] font-semibold'
                            : 'bg-[#101e40] text-[#9ba9c9] border-[rgba(181,210,255,0.12)]'
                        }`}
                      >
                        ↑ Lowest to Highest (Asc)
                      </button>
                      <button
                        onClick={() => setSortOrder('alpha')}
                        className={`p-2.5 rounded-lg border text-center font-mono text-xs transition ${
                          sortOrder === 'alpha'
                            ? 'bg-[#2b599f] text-white border-[#65d9ff] font-semibold'
                            : 'bg-[#101e40] text-[#9ba9c9] border-[rgba(181,210,255,0.12)]'
                        }`}
                      >
                        A → Z (Alphabetical)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. GROUPING TOOLS TAB */}
            {activeTab === 'grouping' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <FolderTree className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Data Grouping & Rollup Transformations
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <b className="text-xs text-[#65d9ff] block mb-1">Country → Continent / Region</b>
                    <p className="text-[11px] text-[#9ba9c9] mb-3">
                      Roll up sovereign countries into 7 global geopolitical blocks (North America, Eurasia, Europe & ESA, Asia-Pacific, etc.).
                    </p>
                    <button
                      onClick={() => onUpdateGrouping({ groupByContinent: !groupingConfig.groupByContinent })}
                      className={`w-full py-2 rounded-lg text-xs font-mono font-semibold border transition ${
                        groupingConfig.groupByContinent
                          ? 'bg-[#5ee5ad] text-[#071025] border-[#5ee5ad]'
                          : 'bg-[#101f44] text-[#cfd8ed] border-[rgba(181,210,255,0.2)]'
                      }`}
                    >
                      {groupingConfig.groupByContinent ? '✓ Continental Rollup ON' : 'Apply Geographic Grouping'}
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <b className="text-xs text-[#ffbf69] block mb-1">Year → Decade Aggregation</b>
                    <p className="text-[11px] text-[#9ba9c9] mb-3">
                      Consolidate individual launch years into 10-year historical eras (1950s, 1960s, 1970s through 2020s).
                    </p>
                    <button
                      onClick={() => onUpdateGrouping({ groupByDecade: !groupingConfig.groupByDecade })}
                      className={`w-full py-2 rounded-lg text-xs font-mono font-semibold border transition ${
                        groupingConfig.groupByDecade
                          ? 'bg-[#ffbf69] text-[#071025] border-[#ffbf69]'
                          : 'bg-[#101f44] text-[#cfd8ed] border-[rgba(181,210,255,0.2)]'
                      }`}
                    >
                      {groupingConfig.groupByDecade ? '✓ Decade Grouping ON' : 'Apply Decade Grouping'}
                    </button>
                  </div>

                  <div className="p-3.5 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <b className="text-xs text-[#df7cff] block mb-1">Mission Outcome → Binary Grouping</b>
                    <p className="text-[11px] text-[#9ba9c9] mb-3">
                      Simplify outcome categories into two clean groups: <b>Success</b> vs <b>Failure / Other</b>.
                    </p>
                    <button
                      onClick={() => onUpdateGrouping({ binaryOutcome: !groupingConfig.binaryOutcome })}
                      className={`w-full py-2 rounded-lg text-xs font-mono font-semibold border transition ${
                        groupingConfig.binaryOutcome
                          ? 'bg-[#df7cff] text-[#071025] border-[#df7cff]'
                          : 'bg-[#101f44] text-[#cfd8ed] border-[rgba(181,210,255,0.2)]'
                      }`}
                    >
                      {groupingConfig.binaryOutcome ? '✓ Binary Outcome ON' : 'Apply Outcome Grouping'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SETS & TOP-N ANALYSIS TAB */}
            {activeTab === 'sets' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <Target className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Sets & Top-N / Bottom-N Analysis
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-[#9ba9c9] block mb-1">Target Dimension:</label>
                    <select
                      value={setDimension}
                      onChange={e => setSetDimension(e.target.value as any)}
                      className="w-full bg-[#0a1636] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="country">Country / Sovereign State</option>
                      <option value="company">Organization / Agency</option>
                      <option value="site">Launch Site / Spaceport</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#9ba9c9] block mb-1">Based On Measure:</label>
                    <select
                      value={setCriteria}
                      onChange={e => setSetCriteria(e.target.value as any)}
                      className="w-full bg-[#0a1636] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="missions">Total Mission Volume</option>
                      <option value="cost">Total Recorded Spend ($M)</option>
                      <option value="rate">Success Rate (%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-[#9ba9c9] block mb-1">Show Set Members:</label>
                    <div className="grid grid-cols-5 gap-1">
                      {[5, 10, 20, 'all', 'bottom5'].map((n: any) => (
                        <button
                          key={n}
                          onClick={() => setSetTopMode(n)}
                          className={`py-2 rounded-lg border text-center font-mono text-[10px] transition ${
                            setTopMode === n
                              ? 'bg-[#2b599f] text-white border-[#65d9ff] font-semibold'
                              : 'bg-[#0a1636] text-[#9ba9c9] border-[rgba(181,210,255,0.12)]'
                          }`}
                        >
                          {n === 'all' ? 'All' : n === 'bottom5' ? 'Bot 5' : `Top ${n}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. CALCULATED FIELDS TAB */}
            {activeTab === 'calculations' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <Calculator className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Calculated Fields & Custom Formula Engine
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)] space-y-2">
                    <label className="text-xs font-mono text-[#9ba9c9] block">Prebuilt Calculated Fields:</label>
                    {[
                      { id: 'successRate', name: 'Success Rate (%)', formula: '(SUM(IF [Outcome]="Success" THEN 1 END) / COUNT([Missions])) × 100' },
                      { id: 'failureRate', name: 'Failure Rate (%)', formula: '(SUM(IF [Outcome]="Failure" THEN 1 END) / COUNT([Missions])) × 100' },
                      { id: 'avgCost', name: 'Average Mission Cost ($M)', formula: 'SUM([Cost]) / COUNT([Cost > 0])' },
                      { id: 'payloadDensity', name: 'Payloads per Mission', formula: 'SUM([Payloads]) / COUNT([Missions])' },
                      { id: 'reliabilityIndex', name: 'Program Reliability Index', formula: '(([Successes] × 1.0 - [Failures] × 0.5) / [Total Missions]) × 100' }
                    ].map(calc => (
                      <div
                        key={calc.id}
                        onClick={() => setSelectedCalcField(calc.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition ${
                          selectedCalcField === calc.id
                            ? 'bg-[#1a3a6b] border-[#65d9ff] text-white'
                            : 'bg-[#0c1938] border-[rgba(181,210,255,0.1)] text-[#9ba9c9] hover:bg-[#13244d]'
                        }`}
                      >
                        <b className="block text-xs text-[#65d9ff]">{calc.name}</b>
                        <code className="text-[10px] text-[#5ee5ad] font-mono block mt-0.5">{calc.formula}</code>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)] flex flex-col justify-between">
                    <div>
                      <b className="text-xs text-[#cfd8ed] block mb-2 font-mono uppercase">Calculated Metric Execution</b>
                      <p className="text-xs text-[#9ba9c9] leading-relaxed mb-3">
                        Calculated fields are computed entirely on the client side using live filtered data rows without altering the immutable underlying CSV files.
                      </p>
                      <div className="p-3 rounded-lg bg-[#071025] border border-[rgba(181,210,255,0.1)] font-mono text-xs">
                        <span className="text-[#9ba9c9] block text-[10px]">Active Evaluation:</span>
                        <strong className="text-[#5ee5ad] text-base block mt-1">
                          {selectedCalcField === 'successRate'
                            ? `${filteredMissions.length ? ((filteredMissions.filter(r => isSuccess(r.outcome)).length / filteredMissions.length) * 100).toFixed(1) : 0}%`
                            : selectedCalcField === 'failureRate'
                            ? `${filteredMissions.length ? ((filteredMissions.filter(r => isFailure(r.outcome)).length / filteredMissions.length) * 100).toFixed(1) : 0}%`
                            : selectedCalcField === 'avgCost'
                            ? `$${(filteredMissions.filter(r => r.cost).reduce((s, r) => s + (r.cost || 0), 0) / (filteredMissions.filter(r => r.cost).length || 1)).toFixed(1)}M`
                            : 'Evaluated Dynamically'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 9. MARKS CARD & VISUAL ENCODINGS TAB */}
            {activeTab === 'marks' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <Palette className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Marks Card · Visual Encoding Attributes
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Color Encoding:</label>
                    <select
                      value={marksConfig.colorEncoding}
                      onChange={e => onUpdateMarks({ colorEncoding: e.target.value as any })}
                      className="w-full bg-[#071025] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="default">Default Palette Gradient</option>
                      <option value="outcome">Color by Mission Status (Success/Fail)</option>
                      <option value="region">Color by Continental Region</option>
                      <option value="rocketStatus">Color by Rocket Status (Active/Retired)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Size Encoding:</label>
                    <select
                      value={marksConfig.sizeEncoding}
                      onChange={e => onUpdateMarks({ sizeEncoding: e.target.value as any })}
                      className="w-full bg-[#071025] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="default">Standard Mark Size</option>
                      <option value="payloads">Size by Satellite Payload Count</option>
                      <option value="cost">Size by Mission Budget ($M)</option>
                    </select>
                  </div>

                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Data Labels:</label>
                    <button
                      onClick={() => onUpdateMarks({ showLabels: !marksConfig.showLabels })}
                      className={`w-full py-2 rounded-lg font-mono text-xs font-semibold border transition ${
                        marksConfig.showLabels
                          ? 'bg-[#5ee5ad] text-[#071025] border-[#5ee5ad]'
                          : 'bg-[#071025] text-[#9ba9c9] border-[rgba(181,210,255,0.18)]'
                      }`}
                    >
                      {marksConfig.showLabels ? '✓ Labels ON' : 'Labels OFF'}
                    </button>
                  </div>

                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Tooltip Detail:</label>
                    <select
                      value={marksConfig.tooltipDetail}
                      onChange={e => onUpdateMarks({ tooltipDetail: e.target.value as any })}
                      className="w-full bg-[#071025] border border-[rgba(181,210,255,0.18)] rounded-lg p-2 text-xs text-white"
                    >
                      <option value="standard">Standard Level of Detail</option>
                      <option value="extended">Extended Comprehensive Tooltips</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 10. HIERARCHY & DRILL-DOWN TAB */}
            {activeTab === 'hierarchy' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <GitFork className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Dimension Hierarchies & Interactive Drill-Down
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Time Hierarchy */}
                  <div className="p-4 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <b className="text-xs text-[#65d9ff] block mb-1">Time Hierarchy: Decade → Year → Month</b>
                    <p className="text-[11px] text-[#9ba9c9] mb-3">
                      Current Depth: <span className="text-white font-mono font-bold uppercase">{hierarchyState.timeLevel}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateHierarchy({
                          timeLevel: hierarchyState.timeLevel === 'month' ? 'year' : 'decade'
                        })}
                        disabled={hierarchyState.timeLevel === 'decade'}
                        className="flex-1 py-2 rounded-lg bg-[#142650] hover:bg-[#1d3775] disabled:opacity-40 text-xs font-mono text-[#9ba9c9] hover:text-white transition"
                      >
                        ← Go Back (Roll Up)
                      </button>
                      <button
                        onClick={() => onUpdateHierarchy({
                          timeLevel: hierarchyState.timeLevel === 'decade' ? 'year' : 'month'
                        })}
                        disabled={hierarchyState.timeLevel === 'month'}
                        className="flex-1 py-2 rounded-lg bg-[#2778c4] hover:bg-[#348be0] disabled:opacity-40 text-xs font-mono text-white font-semibold transition"
                      >
                        + Drill Down (Granular)
                      </button>
                    </div>
                  </div>

                  {/* Geographic Hierarchy */}
                  <div className="p-4 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <b className="text-xs text-[#5ee5ad] block mb-1">Geographic Hierarchy: Continent → Country → Site</b>
                    <p className="text-[11px] text-[#9ba9c9] mb-3">
                      Current Depth: <span className="text-white font-mono font-bold uppercase">{hierarchyState.geoLevel}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onUpdateHierarchy({
                          geoLevel: hierarchyState.geoLevel === 'site' ? 'country' : 'region'
                        })}
                        disabled={hierarchyState.geoLevel === 'region'}
                        className="flex-1 py-2 rounded-lg bg-[#142650] hover:bg-[#1d3775] disabled:opacity-40 text-xs font-mono text-[#9ba9c9] hover:text-white transition"
                      >
                        ← Go Back (Roll Up)
                      </button>
                      <button
                        onClick={() => onUpdateHierarchy({
                          geoLevel: hierarchyState.geoLevel === 'region' ? 'country' : 'site'
                        })}
                        disabled={hierarchyState.geoLevel === 'site'}
                        className="flex-1 py-2 rounded-lg bg-[#2778c4] hover:bg-[#348be0] disabled:opacity-40 text-xs font-mono text-white font-semibold transition"
                      >
                        + Drill Down (Granular)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 11. ANALYTICS SUITE TAB */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <TrendingUp className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Analytics Pane · Statistical Modeling
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Reference Line */}
                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Reference Line:</label>
                    <div className="space-y-1">
                      {(['none', 'average', 'median'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => onUpdateAnalytics({ refLineMode: m })}
                          className={`w-full py-1.5 rounded text-[11px] font-mono border transition ${
                            analyticsConfig.refLineMode === m
                              ? 'bg-[#2b599f] text-white border-[#65d9ff]'
                              : 'bg-[#071025] text-[#9ba9c9] border-[rgba(181,210,255,0.1)]'
                          }`}
                        >
                          {m.toUpperCase()} Line
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trend Line */}
                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">Trend Line:</label>
                    <button
                      onClick={() => onUpdateAnalytics({ enableTrendLine: !analyticsConfig.enableTrendLine })}
                      className={`w-full py-2.5 rounded-lg font-mono text-xs font-semibold border transition ${
                        analyticsConfig.enableTrendLine
                          ? 'bg-[#65d9ff] text-[#071025] border-[#65d9ff]'
                          : 'bg-[#071025] text-[#9ba9c9] border-[rgba(181,210,255,0.18)]'
                      }`}
                    >
                      {analyticsConfig.enableTrendLine ? '✓ Trend Line ON' : 'Enable Trend Line'}
                    </button>
                    <small className="text-[9px] text-[#9ba9c9] block mt-1.5 font-mono">OLS Regression</small>
                  </div>

                  {/* Forecasting */}
                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">5-Year Forecasting:</label>
                    <button
                      onClick={() => onUpdateAnalytics({ enableForecast: !analyticsConfig.enableForecast })}
                      className={`w-full py-2.5 rounded-lg font-mono text-xs font-semibold border transition ${
                        analyticsConfig.enableForecast
                          ? 'bg-[#ffbf69] text-[#071025] border-[#ffbf69]'
                          : 'bg-[#071025] text-[#9ba9c9] border-[rgba(181,210,255,0.18)]'
                      }`}
                    >
                      {analyticsConfig.enableForecast ? '✓ Forecast ON' : 'Enable 5Y Forecast'}
                    </button>
                    <small className="text-[9px] text-[#9ba9c9] block mt-1.5 font-mono">Damped exponential</small>
                  </div>

                  {/* Clustering */}
                  <div className="p-3 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)]">
                    <label className="text-xs font-mono text-[#9ba9c9] block mb-2">K-Means Clustering:</label>
                    <button
                      onClick={() => onUpdateAnalytics({ enableClustering: !analyticsConfig.enableClustering })}
                      className={`w-full py-2.5 rounded-lg font-mono text-xs font-semibold border transition ${
                        analyticsConfig.enableClustering
                          ? 'bg-[#df7cff] text-[#071025] border-[#df7cff]'
                          : 'bg-[#071025] text-[#9ba9c9] border-[rgba(181,210,255,0.18)]'
                      }`}
                    >
                      {analyticsConfig.enableClustering ? '✓ Clusters ON' : 'Run Clustering'}
                    </button>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className="text-[9px] font-mono text-[#9ba9c9]">K:</span>
                      {[2, 3, 4].map((k: any) => (
                        <button
                          key={k}
                          onClick={() => onUpdateAnalytics({ clusterCount: k })}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                            analyticsConfig.clusterCount === k
                              ? 'bg-[#df7cff] text-black font-bold'
                              : 'bg-[#071025] text-[#9ba9c9]'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 13. DASHBOARD ACTIONS TAB */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <Sparkles className="text-[#65d9ff]" size={16} />
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
                    Tableau Dashboard Actions & Cross-Filtering
                  </h3>
                </div>

                <div className="p-4 bg-[#0a1636] rounded-xl border border-[rgba(181,210,255,0.12)] flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[#cfd8ed]">
                      <input
                        type="checkbox"
                        checked={actionConfig.crossFilter}
                        onChange={e => onUpdateActions({ crossFilter: e.target.checked })}
                        className="rounded"
                      />
                      <span><b>Enable Cross-Chart Filtering</b> (Clicking country, org, or outcome filters all charts)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[#cfd8ed]">
                      <input
                        type="checkbox"
                        checked={actionConfig.crossHighlight}
                        onChange={e => onUpdateActions({ crossHighlight: e.target.checked })}
                        className="rounded"
                      />
                      <span><b>Enable Highlighting Actions</b> (Hovering elements highlights related records)</span>
                    </label>
                  </div>

                  <button
                    onClick={onResetFilters}
                    className="px-4 py-2.5 rounded-lg bg-[#203c73] hover:bg-[#2c529e] text-white font-mono text-xs font-semibold transition"
                  >
                    Reset All Dashboard Actions
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

