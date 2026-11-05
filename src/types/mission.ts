export type Mission = {
  company: string;
  location: string;
  site: string;
  country: string;
  region: string;
  date: Date | null;
  year: number | null;
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
