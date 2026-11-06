import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  ZoomIn, ZoomOut, RotateCcw, MapPin, Globe, Compass,
  Layers, Eye, ShieldCheck, Sparkles, Navigation
} from 'lucide-react';
import { Mission } from '../types/mission';
import { isSuccess } from '../utils/data';

interface WorldMapProps {
  missions: Mission[];
  selectedCountry: string;
  selectedSite: string;
  onSelectCountry: (country: string) => void;
  onSelectSite: (site: string) => void;
}

// Major global launch spaceports with geographic coordinates
const SPACEPORTS: { name: string; country: string; lon: number; lat: number; siteAlias: string[] }[] = [
  { name: 'Cape Canaveral / KSC', country: 'USA', lon: -80.607, lat: 28.392, siteAlias: ['cape canaveral', 'kennedy', 'florida', 'lc-39', 'slc-40', 'slc-41'] },
  { name: 'Vandenberg Space Force Base', country: 'USA', lon: -120.61, lat: 34.632, siteAlias: ['vandenberg', 'california', 'slc-4e', 'slc-2'] },
  { name: 'Wallops Flight Facility', country: 'USA', lon: -75.486, lat: 37.834, siteAlias: ['wallops', 'virginia'] },
  { name: 'Starbase / Boca Chica', country: 'USA', lon: -97.156, lat: 25.997, siteAlias: ['boca chica', 'starbase', 'texas'] },
  { name: 'Kodiak Launch Complex', country: 'USA', lon: -152.338, lat: 57.436, siteAlias: ['kodiak', 'alaska'] },
  { name: 'Baikonur Cosmodrome', country: 'Kazakhstan', lon: 63.305, lat: 45.965, siteAlias: ['baikonur', 'kazakhstan'] },
  { name: 'Plesetsk Cosmodrome', country: 'Russia', lon: 40.577, lat: 62.927, siteAlias: ['plesetsk'] },
  { name: 'Vostochny Cosmodrome', country: 'Russia', lon: 128.333, lat: 51.884, siteAlias: ['vostochny'] },
  { name: 'Kapustin Yar', country: 'Russia', lon: 46.294, lat: 48.578, siteAlias: ['kapustin'] },
  { name: 'Guiana Space Centre (Kourou)', country: 'France', lon: -52.768, lat: 5.236, siteAlias: ['kourou', 'guiana', 'french guiana', 'ela-'] },
  { name: 'Jiuquan Satellite Launch Center', country: 'China', lon: 100.291, lat: 40.960, siteAlias: ['jiuquan'] },
  { name: 'Xichang Satellite Launch Center', country: 'China', lon: 102.028, lat: 28.246, siteAlias: ['xichang'] },
  { name: 'Taiyuan Satellite Launch Center', country: 'China', lon: 111.608, lat: 38.849, siteAlias: ['taiyuan'] },
  { name: 'Wenchang Space Launch Site', country: 'China', lon: 110.951, lat: 19.614, siteAlias: ['wenchang', 'hainan'] },
  { name: 'Satish Dhawan Space Centre', country: 'India', lon: 80.233, lat: 13.733, siteAlias: ['sriharikota', 'satish', 'sdsc'] },
  { name: 'Tanegashima Space Center', country: 'Japan', lon: 130.970, lat: 30.400, siteAlias: ['tanegashima'] },
  { name: 'Uchinoura Space Center', country: 'Japan', lon: 131.079, lat: 31.252, siteAlias: ['uchinoura', 'kagoshima'] },
  { name: 'Rocket Lab LC-1 (Mahia)', country: 'New Zealand', lon: 177.864, lat: -39.261, siteAlias: ['mahia', 'rocket lab lc-1', 'new zealand'] },
  { name: 'Palmachim Airbase', country: 'Israel', lon: 34.690, lat: 31.898, siteAlias: ['palmachim'] },
  { name: 'Imam Khomeini Spaceport', country: 'Iran', lon: 53.921, lat: 35.234, siteAlias: ['semnan', 'imam khomeini', 'shahrud'] },
  { name: 'Sohae Satellite Launching Station', country: 'North Korea', lon: 124.705, lat: 39.660, siteAlias: ['sohae', 'tongchang-ri'] },
  { name: 'Naro Space Center', country: 'South Korea', lon: 127.535, lat: 34.431, siteAlias: ['naro', 'goheung'] },
  { name: 'Alcântara Launch Center', country: 'Brazil', lon: -44.368, lat: -2.316, siteAlias: ['alcantara', 'maranhao'] },
  { name: 'San Marco Platform', country: 'Kenya', lon: 40.215, lat: -2.996, siteAlias: ['san marco', 'kenya'] },
  { name: 'Woomera Test Range', country: 'Australia', lon: 136.532, lat: -31.199, siteAlias: ['woomera'] },
  { name: 'Sea Launch (Odyssey)', country: 'Pacific Ocean', lon: -154.0, lat: 0.0, siteAlias: ['sea launch', 'odyssey'] },
  { name: 'Barents Sea Submarine', country: 'Russia', lon: 35.0, lat: 69.5, siteAlias: ['barents', 'submarine'] }
];

// Political country fill colors matching the Geology.com reference map
const POLITICAL_PALETTE: Record<string, string> = {
  'USA': '#f99d75',
  'United States': '#f99d75',
  'Canada': '#fde384',
  'Russia': '#bddaa7',
  'China': '#fced86',
  'India': '#fca668',
  'Brazil': '#fce27a',
  'Australia': '#f9a868',
  'Kazakhstan': '#ffa58c',
  'Greenland': '#c4e2be',
  'Mexico': '#bddaa7',
  'Argentina': '#f99e77',
  'Algeria': '#fcae74',
  'Libya': '#f79f82',
  'Egypt': '#f79f82',
  'Sudan': '#f9a777',
  'Saudi Arabia': '#fcae74',
  'Iran': '#fcae74',
  'Mongolia': '#f89e77',
  'Japan': '#f99e77',
  'France': '#fde384',
  'Germany': '#ffb084',
  'United Kingdom': '#bddaa7',
  'UK': '#bddaa7',
  'Norway': '#a6cbe3',
  'Sweden': '#bddaa7',
  'Finland': '#f99e77',
  'New Zealand': '#f9a868',
  'South Africa': '#fcae74',
  'Indonesia': '#a6cbe3',
  'Dem. Rep. of Congo': '#f99e77',
  'Peru': '#fde384',
  'Bolivia': '#bddaa7',
  'Colombia': '#fcae74',
  'Venezuela': '#f99e77',
  'Chile': '#fde384',
  'Nigeria': '#bddaa7',
  'Kenya': '#fde384',
  'Ethiopia': '#bddaa7',
  'Madagascar': '#fde384',
  'Pakistan': '#bddaa7',
  'Turkey': '#fde384',
  'Ukraine': '#fde384',
  'Spain': '#fde384',
  'Italy': '#a6cbe3',
  'Poland': '#fde384',
  'South Korea': '#a6cbe3',
  'North Korea': '#ffa58c'
};

const PASTEL_FALLBACKS = [
  '#fde384', '#bddaa7', '#f99d75', '#a6cbe3',
  '#fcae74', '#ffa58c', '#c4e2be', '#ffd79e'
];

function getCountryColor(name: string, index: number = 0): string {
  if (POLITICAL_PALETTE[name]) return POLITICAL_PALETTE[name];
  return PASTEL_FALLBACKS[index % PASTEL_FALLBACKS.length];
}

// Prominent country labels matching the reference map
const MAJOR_COUNTRY_LABELS: { name: string; pos: [number, number]; displayName?: string }[] = [
  { name: 'United States', pos: [-98.5, 38.5] },
  { name: 'Canada', pos: [-106.3, 56.1] },
  { name: 'Russia', pos: [95.0, 60.0] },
  { name: 'China', pos: [104.2, 35.8] },
  { name: 'India', pos: [78.9, 21.6] },
  { name: 'Brazil', pos: [-51.9, -12.2] },
  { name: 'Australia', pos: [133.8, -24.3] },
  { name: 'Kazakhstan', pos: [67.0, 48.0] },
  { name: 'Greenland', pos: [-42.0, 72.0], displayName: 'Greenland\n(Denmark)' },
  { name: 'Mexico', pos: [-102.5, 23.6] },
  { name: 'Argentina', pos: [-65.0, -35.0] },
  { name: 'Algeria', pos: [2.5, 28.0] },
  { name: 'Libya', pos: [17.5, 26.5] },
  { name: 'Sudan', pos: [30.0, 15.0] },
  { name: 'Saudi Arabia', pos: [45.0, 24.0] },
  { name: 'Iran', pos: [53.5, 32.5] },
  { name: 'Mongolia', pos: [104.0, 47.0] },
  { name: 'Japan', pos: [138.0, 36.5] },
  { name: 'New Zealand', pos: [174.5, -41.0] },
  { name: 'South Africa', pos: [24.0, -29.0] },
  { name: 'France', pos: [2.2, 46.2] },
  { name: 'U.K.', pos: [-3.0, 54.5] },
  { name: 'Sweden', pos: [16.0, 62.0] },
  { name: 'Norway', pos: [8.5, 61.0] },
  { name: 'Finland', pos: [26.0, 64.0] }
];

let cachedGeoJson: any = null;

export default function WorldMap({
  missions,
  selectedCountry,
  selectedSite,
  onSelectCountry,
  onSelectSite
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const [mapStyle, setMapStyle] = useState<'political' | 'dark' | 'image-ref'>('political');
  const [geoJsonLoaded, setGeoJsonLoaded] = useState(false);
  const [hoveredSite, setHoveredSite] = useState<any | null>(null);

  // Compute missions and success rates per country
  const countryCounts = useMemo(() => {
    const map: Record<string, { count: number; success: number; sites: Set<string> }> = {};
    for (const m of missions) {
      const c = m.country || 'Unknown';
      if (!map[c]) map[c] = { count: 0, success: 0, sites: new Set() };
      map[c].count++;
      if (isSuccess(m.outcome)) map[c].success++;
      if (m.site) map[c].sites.add(m.site);
    }
    return map;
  }, [missions]);

  // Compute spaceports stats
  const siteStats = useMemo(() => {
    return SPACEPORTS.map(port => {
      const matchedMissions = missions.filter(m => {
        const portNameLow = port.name.toLowerCase();
        const siteLow = (m.site || '').toLowerCase();
        const locLow = (m.location || '').toLowerCase();
        const countryMatch = port.country.toLowerCase() === (m.country || '').toLowerCase();
        const aliasMatch = port.siteAlias.some(a => siteLow.includes(a) || locLow.includes(a));
        return (countryMatch && aliasMatch) || siteLow.includes(portNameLow);
      });

      const total = matchedMissions.length;
      const successCount = matchedMissions.filter(m => isSuccess(m.outcome)).length;
      const rate = total ? ((successCount / total) * 100).toFixed(1) : '0';

      return {
        ...port,
        total,
        successCount,
        rate
      };
    });
  }, [missions]);

  // Load and register the clean, accurate world GeoJSON
  useEffect(() => {
    if (cachedGeoJson) {
      echarts.registerMap('world', cachedGeoJson);
      setGeoJsonLoaded(true);
      return;
    }

    fetch('/data/world_countries_clean.json')
      .then(res => res.json())
      .then(data => {
        cachedGeoJson = data;
        echarts.registerMap('world', data);
        setGeoJsonLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load world GeoJSON:', err);
      });
  }, []);

  // Initialize and update ECharts instance
  useEffect(() => {
    if (!geoJsonLoaded || !containerRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(containerRef.current);
    }
    const chart = chartInstance.current;

    const isPolitical = mapStyle === 'political';
    const isDark = mapStyle === 'dark';

    // Ocean styling matching the Geology.com reference map or dark space theme
    const oceanBg = isPolitical ? '#42b1e5' : '#071025';
    const defaultCountryColor = isPolitical ? '#fced86' : '#102146';
    const borderColor = isPolitical ? '#607890' : '#2b528a';
    const borderWidth = isPolitical ? 0.75 : 1;

    // Build region colors for all features
    const regions = (cachedGeoJson?.features || []).map((f: any, idx: number) => {
      const name = f.properties.name;
      const isSelected = selectedCountry === name || (selectedCountry === 'USA' && (name === 'USA' || name === 'United States'));
      const hasLaunches = countryCounts[name] && countryCounts[name].count > 0;

      let areaColor = isPolitical ? getCountryColor(name, idx) : '#0f2044';
      if (isSelected) {
        areaColor = isPolitical ? '#4ce0a2' : '#5ee5ad';
      } else if (!isPolitical && hasLaunches) {
        areaColor = '#1c3e7a';
      }

      return {
        name,
        itemStyle: {
          areaColor,
          borderColor: isSelected ? '#ffffff' : borderColor,
          borderWidth: isSelected ? 2 : borderWidth
        },
        emphasis: {
          itemStyle: {
            areaColor: isPolitical ? '#5ad4ff' : '#65d9ff',
            borderColor: '#ffffff',
            borderWidth: 1.5,
            shadowBlur: 10,
            shadowColor: 'rgba(101,217,255,0.5)'
          }
        }
      };
    });

    // Spaceport scatter points
    const spaceportPoints = siteStats.map(port => {
      const isSelected = selectedCountry === port.country;
      return {
        name: port.name,
        value: [port.lon, port.lat, port.total],
        country: port.country,
        rate: port.rate,
        total: port.total,
        itemStyle: {
          color: isSelected ? '#5ee5ad' : port.total > 0 ? '#ff3b30' : '#9ba9c9',
          borderColor: '#ffffff',
          borderWidth: 1.5
        }
      };
    });

    // Country Labels series matching the reference image typography
    const labelPoints = MAJOR_COUNTRY_LABELS.map(lbl => {
      const count = countryCounts[lbl.name]?.count || (lbl.name === 'United States' ? countryCounts['USA']?.count : 0) || 0;
      return {
        name: lbl.name,
        value: [...lbl.pos, count],
        displayName: lbl.displayName || lbl.name
      };
    });

    const option: echarts.EChartsOption = {
      backgroundColor: oceanBg,
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(11, 22, 48, 0.95)',
        borderColor: '#65d9ff',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#ffffff', fontSize: 12 },
        formatter: (params: any) => {
          if (params.seriesType === 'effectScatter' || params.seriesType === 'scatter') {
            const d = params.data;
            if (d && d.country) {
              return `
                <div style="font-family: 'DM Mono', monospace;">
                  <b style="color: #65d9ff; font-size: 13px;">${d.name}</b><br/>
                  <span style="color: #9ba9c9; font-size: 11px;">${d.country} (${d.value[1]}°, ${d.value[0]}°)</span>
                  <hr style="border: 0; border-top: 1px solid rgba(181,210,255,0.2); margin: 6px 0;" />
                  <div>Missions: <b style="color: #ffffff;">${d.total.toLocaleString()}</b></div>
                  <div>Success Rate: <b style="color: #5ee5ad;">${d.rate}%</b></div>
                  <small style="color: #65d9ff; display: block; margin-top: 4px;">Click to filter by ${d.country}</small>
                </div>
              `;
            }
          }

          // Map country hover
          const countryName = params.name;
          const data = countryCounts[countryName] || (countryName === 'United States of America' || countryName === 'United States' ? countryCounts['USA'] : null);
          const count = data?.count || 0;
          const rate = count ? ((data.success / count) * 100).toFixed(1) : '0';

          return `
            <div style="font-family: 'DM Mono', monospace;">
              <b style="color: #65d9ff; font-size: 13px;">${countryName}</b>
              <hr style="border: 0; border-top: 1px solid rgba(181,210,255,0.2); margin: 6px 0;" />
              <div>Total Launches: <b style="color: #ffffff;">${count.toLocaleString()}</b></div>
              ${count > 0 ? `<div>Success Rate: <b style="color: #5ee5ad;">${rate}%</b></div>` : '<i style="color: #8c9bbd;">No recorded launches</i>'}
              <small style="color: #5ee5ad; display: block; margin-top: 5px; font-size: 10px;">Click to filter dashboard</small>
            </div>
          `;
        }
      },
      geo: {
        map: 'world',
        roam: true,
        aspectScale: 0.75,
        zoom: 1.15,
        center: [12, 18],
        label: {
          show: false
        },
        itemStyle: {
          areaColor: defaultCountryColor,
          borderColor,
          borderWidth
        },
        regions
      },
      series: [
        // 1. Realistic Country Boundaries & Interactive Selection
        {
          name: 'World Countries',
          type: 'map' as const,
          map: 'world',
          geoIndex: 0,
          data: Object.entries(countryCounts).map(([name, data]) => ({
            name,
            value: data.count
          }))
        },
        // 2. Realistic Country Labels matching the Geology.com reference image
        {
          name: 'Country Labels',
          type: 'scatter' as const,
          coordinateSystem: 'geo' as const,
          data: labelPoints,
          symbolSize: 1,
          label: {
            show: true,
            formatter: (p: any) => p.data.displayName || p.data.name,
            position: 'inside' as const,
            color: isPolitical ? '#22384f' : '#cfd8ed',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'Manrope, Arial, sans-serif',
            textBorderColor: isPolitical ? 'rgba(255,255,255,0.85)' : 'rgba(7,16,37,0.85)',
            textBorderWidth: isPolitical ? 2.5 : 2
          },
          zlevel: 2
        },
        // 3. Spaceport Beacons (EffectScatter with Radar Pulses)
        {
          name: 'Global Spaceports',
          type: 'effectScatter' as const,
          coordinateSystem: 'geo' as const,
          data: spaceportPoints,
          symbolSize: (val: any) => Math.max(7, Math.min(16, 7 + Math.sqrt(val[2] || 0) * 0.4)),
          showEffectOn: 'render',
          rippleEffect: {
            brushType: 'stroke' as const,
            scale: 3,
            period: 3
          },
          zlevel: 3
        }
      ]
    };

    chart.setOption(option, true);

    // Click handler for cross-filtering
    chart.off('click');
    chart.on('click', (params: any) => {
      const clickedCountry = params.data?.country || params.name;
      if (clickedCountry) {
        const normalized = clickedCountry === 'United States of America' || clickedCountry === 'United States' ? 'USA' : clickedCountry;
        onSelectCountry(selectedCountry === normalized ? 'All' : normalized);
      }
    });

    const resize = () => chart.resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [geoJsonLoaded, mapStyle, missions, selectedCountry, countryCounts, siteStats, onSelectCountry]);

  const handleZoom = (step: number) => {
    if (!chartInstance.current) return;
    const currentOption: any = chartInstance.current.getOption();
    const currentZoom = currentOption?.geo?.[0]?.zoom || 1.15;
    const nextZoom = Math.max(0.8, Math.min(currentZoom + step, 4.5));
    chartInstance.current.setOption({
      geo: { zoom: nextZoom }
    });
  };

  const handleReset = () => {
    if (!chartInstance.current) return;
    chartInstance.current.setOption({
      geo: { zoom: 1.15, center: [12, 18] }
    });
  };

  return (
    <div className="world-map-container relative overflow-hidden rounded-xl bg-[#091530] border border-[rgba(181,210,255,0.18)] shadow-2xl backdrop-blur-md">
      {/* Map Toolbar Header */}
      <div className="map-toolbar p-3 bg-[#0a1533]/95 border-b border-[rgba(181,210,255,0.14)] flex flex-wrap justify-between items-center gap-2 z-10 relative">
        <div className="flex items-center gap-2">
          <Globe className="text-[#65d9ff]" size={16} />
          <span className="font-mono text-xs uppercase tracking-wider text-[#cfd8ed] font-semibold">
            Accurate Global Political Map & Spaceport Network
          </span>
          {selectedCountry !== 'All' && (
            <span className="bg-[#5ee5ad]/20 text-[#5ee5ad] border border-[#5ee5ad]/40 text-[10px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
              Filtered: {selectedCountry}
            </span>
          )}
        </div>

        {/* View Mode & Map Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#0d1c3e] p-0.5 rounded-lg border border-[rgba(181,210,255,0.15)] text-[10px] font-mono">
            <button
              onClick={() => setMapStyle('political')}
              className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                mapStyle === 'political'
                  ? 'bg-[#2b599f] text-white font-semibold shadow'
                  : 'text-[#9ba9c9] hover:text-white'
              }`}
              title="Accurate Cartographic Political Map Matching Reference Image"
            >
              <Compass size={12} className={mapStyle === 'political' ? 'text-[#fced86]' : ''} />
              Realistic Political Map
            </button>
            <button
              onClick={() => setMapStyle('dark')}
              className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                mapStyle === 'dark'
                  ? 'bg-[#2b599f] text-white font-semibold shadow'
                  : 'text-[#9ba9c9] hover:text-white'
              }`}
              title="Liquid-Glass Dark Orbital Theme"
            >
              <Sparkles size={12} className={mapStyle === 'dark' ? 'text-[#65d9ff]' : ''} />
              Orbital Dark Map
            </button>
            <button
              onClick={() => setMapStyle('image-ref')}
              className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
                mapStyle === 'image-ref'
                  ? 'bg-[#2b599f] text-white font-semibold shadow'
                  : 'text-[#9ba9c9] hover:text-white'
              }`}
              title="Direct Visual Reference Image View"
            >
              <Eye size={12} />
              Reference Image
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#0d1c3e] p-1 rounded-lg border border-[rgba(181,210,255,0.15)]">
            <button
              onClick={() => handleZoom(0.35)}
              className="p-1 hover:bg-[#1a2d5a] rounded text-[#9ba9c9] hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => handleZoom(-0.35)}
              className="p-1 hover:bg-[#1a2d5a] rounded text-[#9ba9c9] hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={handleReset}
              className="p-1 hover:bg-[#1a2d5a] rounded text-[#9ba9c9] hover:text-white transition"
              title="Reset View"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Map Presentation Stage */}
      <div className="relative w-full">
        {mapStyle === 'image-ref' ? (
          <div className="relative w-full h-[450px] overflow-hidden bg-[#0c1f3d] flex items-center justify-center p-2">
            <img
              src="/images/world_map_reference.jpg"
              alt="World Political Reference Map"
              className="w-full h-full object-contain rounded-lg shadow-xl"
            />
            <div className="absolute top-4 left-4 bg-[#0a1533]/90 border border-[rgba(181,210,255,0.25)] rounded-lg px-3 py-1.5 text-xs font-mono text-[#65d9ff] backdrop-blur-md">
              Geology.com World Political Map · Reference Standard
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full h-[450px]"
            style={{ minHeight: 450 }}
          />
        )}
      </div>

      {/* Interactive Spacefaring Nations Legend & Filter Bar */}
      <div className="map-legend px-4 py-2.5 bg-[#071025]/95 border-t border-[rgba(181,210,255,0.12)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-[#9ba9c9] uppercase tracking-wider flex items-center gap-1">
            <Navigation size={12} className="text-[#65d9ff]" />
            Spacefaring Nations (Click to Filter):
          </span>
          {Object.entries(countryCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 9)
            .map(([cName, data]) => {
              const isSelected = selectedCountry === cName;
              return (
                <button
                  key={cName}
                  onClick={() => onSelectCountry(isSelected ? 'All' : cName)}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#5ee5ad] text-[#071025] font-bold border-[#5ee5ad] shadow-md'
                      : 'bg-[#101c39]/70 text-[#b5c7e8] border-[rgba(181,210,255,0.15)] hover:border-[#65d9ff]/50'
                  }`}
                >
                  <span>{cName}</span>
                  <span className="text-[9px] opacity-80">({data.count})</span>
                </button>
              );
            })}
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-[#9ba9c9]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ff3b30] inline-block animate-pulse"></span>
            Spaceport Beacons
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#5ee5ad] inline-block"></span>
            Selected Nation
          </span>
        </div>
      </div>
    </div>
  );
}
