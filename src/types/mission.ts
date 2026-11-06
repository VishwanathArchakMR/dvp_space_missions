export type Mission = {
  company: string;
  location: string;
  site: string;
  country: string;
  region: string;
  date: Date | null;
  year: number | null;
  decade?: string;
  month: string;
  detail: string;
  rocketStatus: string;
  rocket: string;
  outcome: string;
  cost: number | null;
  payloadCount: number;
  orbit: string;
  raw: Record<string, string>;
};

export type Filters = {
  years: [number, number];
  company: string;
  outcome: string;
  site: string;
  rocketStatus: string;
  country: string;
  region: string;
  month: string;
};

export type DataQualityReport = {
  totalRecords: number;
  validDates: number;
  missingDates: number;
  recordsWithCost: number;
  missingCost: number;
  uniqueCompanies: number;
  uniqueCountries: number;
  uniqueSites: number;
  completenessRate: number;
};

export type BoxPlotStat = {
  name: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  count: number;
  avg: number;
};

export type JoinType = 'inner' | 'left' | 'right' | 'full';

export type JoinConfig = {
  dataset1: 'launches' | 'satellites' | 'space_missions';
  dataset2: 'satellites' | 'space_missions' | 'launches';
  matchColumn: 'launch_id' | 'country' | 'company' | 'date';
  joinType: JoinType;
};

export type JoinResultPreview = {
  type: JoinType;
  matchColumn: string;
  dataset1Count: number;
  dataset2Count: number;
  matchedCount: number;
  resultingCount: number;
  sampleRows: Record<string, string>[];
};

export type ToolTab =
  | 'integration'
  | 'filters'
  | 'sorting'
  | 'grouping'
  | 'sets'
  | 'calculations'
  | 'parameters'
  | 'showme'
  | 'marks'
  | 'hierarchy'
  | 'analytics'
  | 'distribution'
  | 'actions';

export type MarksConfig = {
  colorEncoding: 'default' | 'outcome' | 'region' | 'rocketStatus';
  sizeEncoding: 'default' | 'payloads' | 'cost';
  showLabels: boolean;
  tooltipDetail: 'standard' | 'extended';
};

export type GroupingConfig = {
  groupByContinent: boolean;
  groupByDecade: boolean;
  binaryOutcome: boolean;
};

export type ParameterConfig = {
  targetMetric: 'missions' | 'cost' | 'successRate';
  timeHorizon: [number, number];
  activeVisualization: 'bar' | 'line' | 'pie' | 'map' | 'scatter' | 'heatmap' | 'treemap' | 'histogram' | 'boxplot';
};

export type HierarchyState = {
  timeLevel: 'decade' | 'year' | 'month';
  geoLevel: 'region' | 'country' | 'site';
};

export type AnalyticsConfig = {
  refLineMode: 'none' | 'average' | 'median' | 'custom';
  customRefValue: number;
  enableTrendLine: boolean;
  enableForecast: boolean;
  enableClustering: boolean;
  clusterCount: 2 | 3 | 4;
};

export type ActionConfig = {
  crossFilter: boolean;
  crossHighlight: boolean;
};
