import Papa from 'papaparse';
import { BoxPlotStat, DataQualityReport, Mission } from '../types/mission';

const aliases: Record<string, string[]> = {
  company: ['company name', 'company', 'organization', 'space organization', 'provider'],
  location: ['location', 'launch location', 'site'],
  site: ['launch_site', 'launch site', 'site'],
  country: ['country', 'site_country'],
  date: ['datetime', 'datum', 'date', 'launch date', 'date_utc'],
  year: ['year'],
  detail: ['detail', 'mission detail', 'mission'],
  rocketStatus: ['status rocket', 'rocket status', 'provider_type'],
  rocket: ['rocket'],
  outcome: ['status mission', 'mission status', 'mission outcome', 'status', 'outcome'],
  cost: ['cost', 'price', 'mission cost']
};

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const COUNTRY_TO_REGION: Record<string, string> = {
  'USA': 'North America',
  'United States': 'North America',
  'Russia': 'Eurasia',
  'USSR': 'Eurasia',
  'Soviet Union': 'Eurasia',
  'Kazakhstan': 'Eurasia',
  'China': 'Asia-Pacific',
  'Japan': 'Asia-Pacific',
  'India': 'Asia-Pacific',
  'New Zealand': 'Asia-Pacific',
  'South Korea': 'Asia-Pacific',
  'North Korea': 'Asia-Pacific',
  'Australia': 'Asia-Pacific',
  'France': 'Europe & ESA',
  'French Guiana': 'Europe & ESA',
  'United Kingdom': 'Europe & ESA',
  'UK': 'Europe & ESA',
  'Germany': 'Europe & ESA',
  'Italy': 'Europe & ESA',
  'Israel': 'Middle East',
  'Iran': 'Middle East',
  'Brazil': 'South America',
  'Kenya': 'Africa',
  'Pacific Ocean': 'Oceanic / Sea',
  'Barents Sea': 'Oceanic / Sea',
  'Sea Launch': 'Oceanic / Sea',
  'Gran Canaria': 'Europe & ESA'
};

export function getRegionForCountry(country: string): string {
  const clean = country.trim();
  if (COUNTRY_TO_REGION[clean]) return COUNTRY_TO_REGION[clean];
  for (const [key, region] of Object.entries(COUNTRY_TO_REGION)) {
    if (clean.toLowerCase().includes(key.toLowerCase())) return region;
  }
  return 'Other';
}

const pick = (row: Record<string, string>, key: string): string => {
  const cols = Object.keys(row);
  const found = aliases[key]?.map(x => cols.find(c => c.toLowerCase().trim() === x)).find(Boolean);
  return found ? (row[found] || '') : '';
};

const dateOf = (v: string): Date | null => {
  if (!v || !v.trim()) return null;
  const d = new Date(v.trim());
  return Number.isNaN(d.valueOf()) ? null : d;
};

const numberOf = (v: string | number | undefined | null): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function parseCsv(text: string): Mission[] {
  const rows = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true }).data;
  return rows.map(raw => {
    const rawDateStr = pick(raw, 'date') || raw.Datum || raw.DateTime || '';
    const date = dateOf(rawDateStr);
    const parsedYear = Number(pick(raw, 'year') || raw.Year);
    const year = parsedYear && !Number.isNaN(parsedYear) ? parsedYear : date?.getFullYear() || null;
    
    // Month extraction
    let month = 'Unknown';
    if (raw.Month && MONTH_NAMES.includes(raw.Month as any)) {
      month = raw.Month;
    } else if (date) {
      month = MONTH_NAMES[date.getMonth()] || 'Unknown';
    }

    const country = pick(raw, 'country') || raw.Country || extractCountryFromLocation(pick(raw, 'location') || raw.Location) || 'Unknown';
    const region = getRegionForCountry(country);

    // In space_missions.csv, the 'Rocket' column is often numerical cost in $ millions (e.g., 50.0)
    let cost = numberOf(pick(raw, 'cost'));
    if (cost === null && raw.Rocket) {
      cost = numberOf(raw.Rocket);
    }

    const rocket = (cost !== null && raw.Rocket === String(cost)) 
      ? (pick(raw, 'detail') || 'Rocket') 
      : (pick(raw, 'rocket') || raw.Rocket || 'Unknown');

    return {
      company: pick(raw, 'company') || raw['Company Name'] || 'Unknown',
      location: pick(raw, 'location') || raw.Location || 'Unknown',
      site: pick(raw, 'site') || raw.Launch_Site || pick(raw, 'location') || 'Unknown',
      country,
      region,
      date,
      year,
      month,
      detail: pick(raw, 'detail') || raw.Detail || 'Unknown',
      rocketStatus: pick(raw, 'rocketStatus') || raw['Status Rocket'] || 'Unknown',
      rocket,
      outcome: pick(raw, 'outcome') || raw['Status Mission'] || 'Unknown',
      cost,
      payloadCount: Number(raw.payloads_catalogued) || Number(raw.Count) || 0,
      orbit: raw.orbit || 'Unknown',
      raw
    };
  });
}

function extractCountryFromLocation(loc?: string): string {
  if (!loc) return '';
  const parts = loc.split(',').map(p => p.trim());
  return parts[parts.length - 1] || '';
}

export function joinLaunchesAndSatellites(
  launchesText: string,
  satellitesText: string,
  spaceMissionsText?: string
): Mission[] {
  const launches = parseCsv(launchesText);
  const sats = Papa.parse<Record<string, string>>(satellitesText, { header: true, skipEmptyLines: true }).data;
  
  const byLaunch = sats.reduce<Record<string, Record<string, string>[]>>((a, s) => {
    if (s.launch_id) (a[s.launch_id] ??= []).push(s);
    return a;
  }, {});

  // Optional: Build cost lookup map from space_missions.csv if available
  const costLookup = new Map<string, number>();
  if (spaceMissionsText) {
    const spaceRows = Papa.parse<Record<string, string>>(spaceMissionsText, { header: true, skipEmptyLines: true }).data;
    for (const s of spaceRows) {
      const costVal = numberOf(s.Rocket);
      if (costVal !== null) {
        const dStr = (s.DateTime || s.Datum || '').slice(0, 10);
        const comp = (s['Company Name'] || '').toLowerCase().trim();
        if (dStr && comp) {
          costLookup.set(`${dStr}_${comp}`, costVal);
        }
        if (dStr && !costLookup.has(dStr)) {
          costLookup.set(dStr, costVal);
        }
      }
    }
  }

  return launches.map(l => {
    const linked = byLaunch[l.raw.launch_id] || [];
    const orbits = [...new Set(linked.map(s => s.orbit_centre).filter(Boolean))];
    
    // Look up enriched cost if not already present
    let cost = l.cost;
    if (cost === null && l.date) {
      const dStr = l.date.toISOString().slice(0, 10);
      const comp = l.company.toLowerCase().trim();
      cost = costLookup.get(`${dStr}_${comp}`) ?? costLookup.get(dStr) ?? null;
    }

    return {
      ...l,
      cost,
      payloadCount: linked.length || l.payloadCount,
      orbit: orbits.join(', ') || l.orbit
    };
  });
}

export const group = (rows: Mission[], key: (r: Mission) => string) =>
  Object.entries(
    rows.reduce<Record<string, number>>((a, r) => {
      const k = key(r) || 'Unknown';
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

export const isSuccess = (o: string): boolean =>
  /success/i.test(o) && !/partial|fail/i.test(o);

export const isFailure = (o: string): boolean =>
  /fail/i.test(o);

// Data Quality Validation Layer
export function validateDataset(rows: Mission[]): DataQualityReport {
  const total = rows.length;
  if (!total) {
    return {
      totalRecords: 0,
      validDates: 0,
      missingDates: 0,
      recordsWithCost: 0,
      missingCost: 0,
      uniqueCompanies: 0,
      uniqueCountries: 0,
      uniqueSites: 0,
      completenessRate: 0
    };
  }

  let validDates = 0;
  let recordsWithCost = 0;
  const companies = new Set<string>();
  const countries = new Set<string>();
  const sites = new Set<string>();

  for (const r of rows) {
    if (r.date && !Number.isNaN(r.date.valueOf())) validDates++;
    if (r.cost !== null && r.cost > 0) recordsWithCost++;
    if (r.company && r.company !== 'Unknown') companies.add(r.company);
    if (r.country && r.country !== 'Unknown') countries.add(r.country);
    if (r.site && r.site !== 'Unknown') sites.add(r.site);
  }

  const dateScore = validDates / total;
  const companyScore = companies.size > 0 ? 1 : 0.5;
  const completenessRate = +(((dateScore * 0.5 + companyScore * 0.3 + (recordsWithCost ? 0.2 : 0.1)) * 100).toFixed(1));

  return {
    totalRecords: total,
    validDates,
    missingDates: total - validDates,
    recordsWithCost,
    missingCost: total - recordsWithCost,
    uniqueCompanies: companies.size,
    uniqueCountries: countries.size,
    uniqueSites: sites.size,
    completenessRate
  };
}

// Statistical Box Plot computations
export function computeBoxPlotStats(
  groups: { name: string; values: number[] }[]
): BoxPlotStat[] {
  return groups
    .filter(g => g.values.length >= 3)
    .map(g => {
      const sorted = [...g.values].sort((a, b) => a - b);
      const n = sorted.length;
      
      const q1Index = Math.floor(n * 0.25);
      const medianIndex = Math.floor(n * 0.5);
      const q3Index = Math.floor(n * 0.75);

      const q1 = sorted[q1Index];
      const median = n % 2 === 0 ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2 : sorted[medianIndex];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;

      const lowerFence = Math.max(sorted[0], +(q1 - 1.5 * iqr).toFixed(2));
      const upperFence = Math.min(sorted[n - 1], +(q3 + 1.5 * iqr).toFixed(2));

      const outliers = sorted.filter(v => v < lowerFence || v > upperFence);
      const avg = +(sorted.reduce((s, x) => s + x, 0) / n).toFixed(2);

      return {
        name: g.name,
        min: lowerFence,
        q1: +q1.toFixed(2),
        median: +median.toFixed(2),
        q3: +q3.toFixed(2),
        max: upperFence,
        outliers,
        count: n,
        avg
      };
    });
}

// Linear Regression Trend Line
export function computeTrendLine(points: [number, number][]): [number, number][] {
  const n = points.length;
  if (n < 2) return [];

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return [];

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const minX = Math.min(...points.map(p => p[0]));
  const maxX = Math.max(...points.map(p => p[0]));

  return [
    [minX, +(slope * minX + intercept).toFixed(2)],
    [maxX, +(slope * maxX + intercept).toFixed(2)]
  ];
}

// 5-Year Time Series Forecast (Exponential Smoothing + Linear Growth)
export function computeForecast(
  annualData: [number, number][],
  forecastYears: number = 5
): { year: number; forecast: number; lower: number; upper: number }[] {
  if (annualData.length < 5) return [];

  const lastYear = annualData[annualData.length - 1][0];
  const recent = annualData.slice(-7); // Last 7 years
  
  // Calculate average annual increment
  let totalDelta = 0;
  for (let i = 1; i < recent.length; i++) {
    totalDelta += recent[i][1] - recent[i - 1][1];
  }
  const avgGrowth = totalDelta / (recent.length - 1);
  const lastVal = annualData[annualData.length - 1][1];

  const results: { year: number; forecast: number; lower: number; upper: number }[] = [];
  for (let step = 1; step <= forecastYears; step++) {
    const yr = lastYear + step;
    // Damped trend projection
    const projected = Math.max(5, Math.round(lastVal + avgGrowth * step * 0.85));
    // Expanding confidence cone (+/- 12% per year)
    const margin = Math.round(projected * (0.08 + step * 0.04));
    results.push({
      year: yr,
      forecast: projected,
      lower: Math.max(0, projected - margin),
      upper: projected + margin
    });
  }

  return results;
}

// Histogram Dynamic Binning
export function computeHistogramBins(
  values: number[],
  numBins: number = 8
): { label: string; count: number; min: number; max: number }[] {
  if (!values.length) return [];
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  if (minVal === maxVal) {
    return [{ label: `${minVal}`, count: values.length, min: minVal, max: maxVal }];
  }

  const range = maxVal - minVal;
  const step = Math.max(1, Math.ceil(range / numBins));

  return Array.from({ length: numBins }, (_, i) => {
    const binStart = minVal + i * step;
    const binEnd = i === numBins - 1 ? maxVal : minVal + (i + 1) * step;
    const count = values.filter(v => 
      i === numBins - 1 ? (v >= binStart && v <= binEnd) : (v >= binStart && v < binEnd)
    ).length;

    return {
      label: `${Math.round(binStart)}–${Math.round(binEnd)}`,
      count,
      min: binStart,
      max: binEnd
    };
  });
}


export function getDecadeForYear(year: number | null): string {
  if (!year) return 'Unknown Decade';
  const decadeStart = Math.floor(year / 10) * 10;
  return `${decadeStart}s`;
}

// In-Memory SQL-Style Join Execution for Multi-Dataset Integration
export function executeTableJoin(
  dataset1Type: 'launches' | 'satellites' | 'space_missions',
  dataset2Type: 'launches' | 'satellites' | 'space_missions',
  ds1Data: any[],
  ds2Data: any[],
  matchColumn: string,
  joinType: 'inner' | 'left' | 'right' | 'full'
): {
  joinedRows: any[];
  dataset1Count: number;
  dataset2Count: number;
  matchedCount: number;
  resultingCount: number;
  sampleRows: Record<string, string>[];
} {
  const ds1 = ds1Data || [];
  const ds2 = ds2Data || [];

  // Helper to extract normalized match key from row
  const getKey = (row: any, col: string): string => {
    if (!row) return '';
    const val = row[col] || row[col.toLowerCase()] || '';
    return String(val).trim().toLowerCase();
  };

  // Build lookup index from dataset2
  const ds2Map = new Map<string, any[]>();
  ds2.forEach(r => {
    const k = getKey(r, matchColumn);
    if (k) {
      if (!ds2Map.has(k)) ds2Map.set(k, []);
      ds2Map.get(k)!.push(r);
    }
  });

  const joined: any[] = [];
  const matchedKeys = new Set<string>();
  const ds2UsedIndices = new Set<number>();

  // Process dataset 1
  ds1.forEach(r1 => {
    const k = getKey(r1, matchColumn);
    const matches = k ? ds2Map.get(k) : undefined;

    if (matches && matches.length > 0) {
      matchedKeys.add(k);
      matches.forEach(r2 => {
        joined.push({ ...r1, ...r2, _joinMatch: true });
      });
    } else {
      // Unmatched row from Dataset 1
      if (joinType === 'left' || joinType === 'full') {
        joined.push({ ...r1, _joinMatch: false });
      }
    }
  });

  // Track used indices for Right / Full Outer Joins
  if (joinType === 'right' || joinType === 'full') {
    const ds1Keys = new Set(ds1.map(r1 => getKey(r1, matchColumn)).filter(Boolean));
    ds2.forEach(r2 => {
      const k = getKey(r2, matchColumn);
      if (!ds1Keys.has(k)) {
        joined.push({ ...r2, _joinMatch: false });
      }
    });
  }

  // Filter for Inner Join
  const finalRows = joinType === 'inner'
    ? joined.filter(r => r._joinMatch)
    : joined;

  const sampleRows = finalRows.slice(0, 5).map(r => {
    const clean: Record<string, string> = {};
    Object.keys(r).slice(0, 6).forEach(k => {
      if (k !== '_joinMatch' && k !== 'raw') clean[k] = String(r[k] ?? '');
    });
    return clean;
  });

  return {
    joinedRows: finalRows,
    dataset1Count: ds1.length,
    dataset2Count: ds2.length,
    matchedCount: matchedKeys.size,
    resultingCount: finalRows.length,
    sampleRows
  };
}

// 2D K-Means Clustering Algorithm for Analytics (Cost vs Payloads)
export function computeKMeansClusters(
  points: { id: string; x: number; y: number; label: string; company: string }[],
  k: number = 3,
  iterations: number = 10
): { clusterIndex: number; point: { id: string; x: number; y: number; label: string; company: string } }[] {
  if (points.length < k || k <= 1) {
    return points.map(p => ({ clusterIndex: 0, point: p }));
  }

  // Find min/max for normalization
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x)) || 1;
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y)) || 1;

  const norm = (p: { x: number; y: number }) => ({
    nx: (p.x - minX) / (maxX - minX || 1),
    ny: (p.y - minY) / (maxY - minY || 1)
  });

  // Initialize centroids
  const centroids: { nx: number; ny: number }[] = [];
  const step = Math.floor(points.length / k);
  for (let i = 0; i < k; i++) {
    const pt = norm(points[Math.min(i * step, points.length - 1)]);
    centroids.push({ nx: pt.nx, ny: pt.ny });
  }

  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < iterations; iter++) {
    // Assign points to nearest centroid
    assignments = points.map(p => {
      const np = norm(p);
      let closestIdx = 0;
      let minDistance = Infinity;
      centroids.forEach((c, cIdx) => {
        const dist = Math.hypot(np.nx - c.nx, np.ny - c.ny);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = cIdx;
        }
      });
      return closestIdx;
    });

    // Update centroids
    for (let cIdx = 0; cIdx < k; cIdx++) {
      const clusterPoints = points.filter((_, idx) => assignments[idx] === cIdx);
      if (clusterPoints.length > 0) {
        const avgX = clusterPoints.reduce((s, p) => s + norm(p).nx, 0) / clusterPoints.length;
        const avgY = clusterPoints.reduce((s, p) => s + norm(p).ny, 0) / clusterPoints.length;
        centroids[cIdx] = { nx: avgX, ny: avgY };
      }
    }
  }

  return points.map((p, idx) => ({
    clusterIndex: assignments[idx],
    point: p
  }));
}
