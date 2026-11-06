import React, { useMemo, useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, MapPin, Globe, Layers, Eye, Compass } from 'lucide-react';
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
  { name: 'Guiana Space Centre (Kourou)', country: 'French Guiana', lon: -52.768, lat: 5.236, siteAlias: ['kourou', 'guiana', 'french guiana', 'ela-'] },
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
  { name: 'Barents Sea Submarine', country: 'Barents Sea', lon: 35.0, lat: 69.5, siteAlias: ['barents', 'submarine'] }
];

// Country centroid coordinates for country-based map heat pins
const COUNTRY_COORDINATES: Record<string, { lon: number; lat: number }> = {
  'USA': { lon: -98.58, lat: 39.83 },
  'United States': { lon: -98.58, lat: 39.83 },
  'Russia': { lon: 95.0, lat: 60.0 },
  'Kazakhstan': { lon: 67.0, lat: 48.0 },
  'China': { lon: 104.2, lat: 35.86 },
  'France': { lon: 2.21, lat: 46.23 },
  'French Guiana': { lon: -53.13, lat: 3.93 },
  'Japan': { lon: 138.25, lat: 36.2 },
  'India': { lon: 78.96, lat: 20.59 },
  'New Zealand': { lon: 174.89, lat: -40.9 },
  'Israel': { lon: 34.85, lat: 31.05 },
  'Iran': { lon: 53.69, lat: 32.43 },
  'North Korea': { lon: 127.51, lat: 40.34 },
  'South Korea': { lon: 127.77, lat: 35.91 },
  'Brazil': { lon: -51.93, lat: -14.24 },
  'Kenya': { lon: 37.91, lat: -0.02 },
  'Australia': { lon: 133.78, lat: -25.27 },
  'United Kingdom': { lon: -3.44, lat: 55.38 },
  'UK': { lon: -3.44, lat: 55.38 }
};

// Simplified geographic continent paths for world outline (Equirectangular 1000x500)
const CONTINENT_PATHS = [
  // North America
  "M 120 70 L 160 55 L 210 50 L 250 80 L 265 120 L 230 150 L 220 180 L 210 210 L 180 250 L 165 290 L 185 300 L 205 270 L 220 220 L 260 210 L 280 180 L 300 190 L 320 160 L 335 120 L 300 100 L 270 90 L 240 60 Z",
  // Greenland
  "M 340 45 L 390 40 L 420 70 L 380 110 L 340 90 Z",
  // South America
  "M 215 310 L 250 300 L 300 320 L 350 370 L 360 410 L 330 460 L 290 490 L 275 460 L 270 400 L 240 350 Z",
  // Europe
  "M 470 120 L 520 110 L 560 130 L 580 170 L 550 190 L 520 180 L 490 200 L 460 190 L 470 150 Z",
  // Scandinavia
  "M 500 80 L 530 65 L 560 90 L 540 130 L 515 130 Z",
  // Africa
  "M 465 205 L 520 195 L 580 220 L 610 270 L 600 330 L 570 410 L 530 450 L 500 410 L 470 330 L 450 260 Z",
  // Eurasia / Asia
  "M 565 125 L 630 100 L 720 90 L 800 100 L 870 120 L 910 160 L 860 200 L 830 220 L 810 270 L 770 290 L 730 270 L 710 240 L 670 230 L 610 220 L 580 170 Z",
  // India subcontinent
  "M 710 240 L 740 250 L 735 310 L 715 320 L 695 270 Z",
  // Southeast Asia & Japan
  "M 820 230 L 860 250 L 850 320 L 810 300 Z M 870 180 L 890 190 L 875 220 L 855 210 Z",
  // Australia
  "M 820 370 L 880 360 L 920 400 L 900 450 L 840 460 L 810 410 Z",
  // New Zealand
  "M 935 440 L 950 445 L 940 480 L 925 470 Z"
];

function projectLonLat(lon: number, lat: number, width = 1000, height = 500): [number, number] {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return [x, y];
}

export default function WorldMap({
  missions,
  selectedCountry,
  selectedSite,
  onSelectCountry,
  onSelectSite
}: WorldMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCountry, setHoveredCountry] = useState<{ name: string; count: number; rate: string; x: number; y: number } | null>(null);
  const [hoveredSite, setHoveredSite] = useState<any | null>(null);
  const [mapMode, setMapMode] = useState<'neon' | 'reference' | 'split'>('neon');
  const svgRef = useRef<SVGSVGElement>(null);

  // Compute missions by country
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

  // Compute country-level markers
  const countryMarkers = useMemo(() => {
    const maxVal = Math.max(1, ...Object.values(countryCounts).map(v => v.count));
    return Object.entries(countryCounts)
      .map(([countryName, data]) => {
        const coords = COUNTRY_COORDINATES[countryName];
        if (!coords) return null;
        const [x, y] = projectLonLat(coords.lon, coords.lat);
        const rate = data.count ? ((data.success / data.count) * 100).toFixed(1) : '0';
        const radius = Math.max(8, Math.min(28, 8 + Math.sqrt(data.count / maxVal) * 20));
        return {
          name: countryName,
          count: data.count,
          rate,
          x,
          y,
          radius
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [countryCounts]);

  // Compute stats for each spaceport
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
      const [x, y] = projectLonLat(port.lon, port.lat);

      return {
        ...port,
        x,
        y,
        total,
        successCount,
        rate
      };
    });
  }, [missions]);

  const maxPortCount = useMemo(() => Math.max(1, ...siteStats.map(s => s.total)), [siteStats]);

  // Mouse drag handlers for smooth pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="world-map-container relative overflow-hidden rounded-xl bg-[#091530]/80 border border-[rgba(181,210,255,0.15)] backdrop-blur-md">
      {/* Map Header and Mode Toggles */}
      <div className="map-toolbar p-3 bg-[#0a1533]/90 border-b border-[rgba(181,210,255,0.12)] flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <Globe className="text-[#65d9ff]" size={16} />
          <span className="font-mono text-xs uppercase tracking-wider text-[#cfd8ed] font-semibold">
            Global Spaceport Network & Country Mission Density
          </span>
          {selectedCountry !== 'All' && (
            <span className="bg-[#65d9ff]/20 text-[#65d9ff] border border-[#65d9ff]/40 text-[10px] px-2 py-0.5 rounded-full font-mono">
              Filtered: {selectedCountry}
            </span>
          )}
        </div>

        {/* View mode toggle & zoom controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#0d1c3e] p-0.5 rounded-lg border border-[rgba(181,210,255,0.15)] text-[10px] font-mono">
            <button
              onClick={() => setMapMode('neon')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'neon' ? 'bg-[#2a4f8f] text-white font-semibold' : 'text-[#9ba9c9] hover:text-white'}`}
              title="Neon Interactive Spaceport View"
            >
              Neon Grid
            </button>
            <button
              onClick={() => setMapMode('reference')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'reference' ? 'bg-[#2a4f8f] text-white font-semibold' : 'text-[#9ba9c9] hover:text-white'}`}
              title="Political World Map Visual Reference Layer"
            >
              Political Map Reference
            </button>
            <button
              onClick={() => setMapMode('split')}
              className={`px-2.5 py-1 rounded transition ${mapMode === 'split' ? 'bg-[#2a4f8f] text-white font-semibold' : 'text-[#9ba9c9] hover:text-white'}`}
              title="Overlay & Side-by-Side Comparison"
            >
              Dual Mode
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#0d1c3e] p-1 rounded-lg border border-[rgba(181,210,255,0.15)]">
            <button
              onClick={() => setZoom(z => Math.min(z + 0.35, 3.5))}
              className="p-1 hover:bg-[#1a2d5a] rounded text-[#9ba9c9] hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.35, 0.85))}
              className="p-1 hover:bg-[#1a2d5a] rounded text-[#9ba9c9] hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={resetView}
              className="p-1 hover:bg-[#1a2d5a] rounded text-[#9ba9c9] hover:text-white transition"
              title="Reset Zoom"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Map Presentation Stage */}
      <div className="relative">
        {/* If in Reference or Dual Mode: Display the Provided World Map Image */}
        {(mapMode === 'reference' || mapMode === 'split') && (
          <div className="relative w-full h-[400px] overflow-hidden bg-[#0c1f3d] flex items-center justify-center">
            {/* World Map Reference Image */}
            <img
              src="/images/world_map_reference.jpg"
              alt="World Map Political Reference"
              className="w-full h-full object-cover opacity-85 select-none"
              style={{
                filter: 'brightness(0.9) contrast(1.1) saturate(1.15)',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
            />

            {/* Interactive SVG Overlay on top of the reference image */}
            <svg
              viewBox="0 0 1000 500"
              className={`absolute inset-0 w-full h-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} transform-origin="500 250">
                {/* Interactive Country Mission Bubbles overlaid on the image */}
                {countryMarkers.map(c => {
                  const isSelected = selectedCountry === c.name;
                  return (
                    <g
                      key={c.name}
                      transform={`translate(${c.x}, ${c.y})`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCountry(selectedCountry === c.name ? 'All' : c.name);
                      }}
                      onMouseEnter={() => setHoveredCountry(c)}
                      onMouseLeave={() => setHoveredCountry(null)}
                    >
                      {/* Pulsing ring */}
                      <circle
                        r={c.radius * 1.5}
                        fill={isSelected ? '#5ee5ad' : '#65d9ff'}
                        opacity={0.35}
                        className="animate-ping"
                      />
                      {/* Main country highlight node */}
                      <circle
                        r={c.radius}
                        fill={isSelected ? '#5ee5ad' : '#143875'}
                        stroke={isSelected ? '#ffffff' : '#65d9ff'}
                        strokeWidth="2.5"
                        fillOpacity={0.8}
                        className="transition-transform group-hover:scale-125"
                      />
                      {/* Mission count label */}
                      <text
                        textAnchor="middle"
                        dy=".3em"
                        fill="#ffffff"
                        fontSize={Math.max(8, Math.min(12, c.radius * 0.75))}
                        fontWeight="bold"
                        className="pointer-events-none font-mono"
                      >
                        {c.count}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Reference Map Attribution & Info Badge */}
            <div className="absolute top-3 left-3 bg-[#0a1533]/90 border border-[rgba(181,210,255,0.2)] rounded-lg px-2.5 py-1 text-[10px] font-mono text-[#65d9ff] backdrop-blur-md">
              <span>Map Reference Layer: Highlighting Active Spacefaring Nations</span>
            </div>
          </div>
        )}

        {/* If in Neon or Dual Mode: Display the High-Tech SVG Spaceport Network */}
        {(mapMode === 'neon' || mapMode === 'split') && (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox="0 0 1000 500"
              className={`w-full ${mapMode === 'split' ? 'h-[320px] border-t border-[rgba(181,210,255,0.15)]' : 'h-[400px]'} select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                <radialGradient id="beaconGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#65d9ff" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#9875ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#9875ff" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="activeBeacon" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#5ee5ad" stopOpacity="1" />
                  <stop offset="60%" stopColor="#5ee5ad" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#5ee5ad" stopOpacity="0" />
                </radialGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} transform-origin="500 250">
                {/* Grid lines (Equator & Meridians) */}
                <line x1="0" y1="250" x2="1000" y2="250" stroke="rgba(146,170,220,0.08)" strokeDasharray="3 3" />
                <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(146,170,220,0.08)" strokeDasharray="3 3" />
                <circle cx="500" cy="250" r="240" fill="none" stroke="rgba(146,170,220,0.04)" strokeDasharray="4 6" />

                {/* Continent Landmasses */}
                {CONTINENT_PATHS.map((pathStr, i) => (
                  <path
                    key={i}
                    d={pathStr}
                    fill="#13244d"
                    stroke="#213a73"
                    strokeWidth="1.2"
                    className="transition-colors hover:fill-[#1b326b]"
                  />
                ))}

                {/* Spaceport Beacons and Markers */}
                {siteStats.map((port, idx) => {
                  const isCountrySelected = selectedCountry === port.country;
                  const hasLaunches = port.total > 0;
                  const radius = Math.max(4, Math.min(18, 4 + Math.sqrt(port.total / (maxPortCount || 1)) * 14));

                  return (
                    <g
                      key={idx}
                      transform={`translate(${port.x}, ${port.y})`}
                      className="cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCountry(port.country);
                      }}
                      onMouseEnter={() => setHoveredSite(port)}
                      onMouseLeave={() => setHoveredSite(null)}
                    >
                      {hasLaunches && (
                        <circle
                          r={radius * 1.8}
                          fill={isCountrySelected ? 'url(#activeBeacon)' : 'url(#beaconGlow)'}
                          className="animate-pulse opacity-75"
                        />
                      )}
                      <circle
                        r={radius}
                        fill={isCountrySelected ? '#5ee5ad' : hasLaunches ? '#65d9ff' : '#60708b'}
                        stroke={isCountrySelected ? '#ffffff' : '#071025'}
                        strokeWidth="1.5"
                        filter="url(#glow)"
                        className="transition-transform group-hover:scale-125"
                      />
                      <circle r={2} fill="#ffffff" />
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Floating Hover Tooltip for Spaceport Beacons */}
      {hoveredSite && (
        <div className="map-tooltip absolute bottom-14 left-4 z-20 pointer-events-none bg-[#0c1328]/95 border border-[#65d9ff]/50 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[210px] text-xs">
          <div className="flex items-center gap-1.5 text-[#65d9ff] font-semibold mb-1">
            <MapPin size={13} />
            <span>{hoveredSite.name}</span>
          </div>
          <div className="text-[11px] text-[#9ba9c9] mb-1.5 font-mono">
            {hoveredSite.country} ({hoveredSite.lat.toFixed(1)}°, {hoveredSite.lon.toFixed(1)}°)
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgba(181,210,255,0.12)]">
            <div>
              <span className="text-[#9ba9c9] block text-[10px]">Missions</span>
              <strong className="text-white text-sm">{hoveredSite.total.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[#9ba9c9] block text-[10px]">Success Rate</span>
              <strong className="text-[#5ee5ad] text-sm">{hoveredSite.rate}%</strong>
            </div>
          </div>
          <div className="mt-2 text-[9px] text-[#70dbff] tracking-wide uppercase font-mono">
            Click to filter by {hoveredSite.country}
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip for Country Heat Nodes */}
      {hoveredCountry && (
        <div className="map-tooltip absolute bottom-14 right-4 z-20 pointer-events-none bg-[#0c1328]/95 border border-[#5ee5ad]/60 rounded-xl p-3 shadow-2xl backdrop-blur-md min-w-[200px] text-xs">
          <div className="flex items-center gap-1.5 text-[#5ee5ad] font-semibold mb-1">
            <Globe size={13} />
            <span>{hoveredCountry.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[rgba(181,210,255,0.12)]">
            <div>
              <span className="text-[#9ba9c9] block text-[10px]">Total Missions</span>
              <strong className="text-white text-sm">{hoveredCountry.count.toLocaleString()}</strong>
            </div>
            <div>
              <span className="text-[#9ba9c9] block text-[10px]">Success Rate</span>
              <strong className="text-[#5ee5ad] text-sm">{hoveredCountry.rate}%</strong>
            </div>
          </div>
          <div className="mt-2 text-[9px] text-[#5ee5ad] tracking-wide uppercase font-mono">
            Click country node to filter
          </div>
        </div>
      )}

      {/* Interactive Country Selection Pills Bar */}
      <div className="map-legend px-4 py-2.5 bg-[#071025]/90 border-t border-[rgba(181,210,255,0.12)] flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono text-[#9ba9c9] uppercase tracking-wider flex items-center gap-1">
          <Compass size={12} className="text-[#65d9ff]" />
          Spacefaring Nations:
        </span>
        {Object.entries(countryCounts)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 8)
          .map(([cName, data]) => (
            <button
              key={cName}
              onClick={() => onSelectCountry(selectedCountry === cName ? 'All' : cName)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition flex items-center gap-1.5 ${
                selectedCountry === cName
                  ? 'bg-[#65d9ff] text-[#071025] font-semibold border-[#65d9ff]'
                  : 'bg-[#101c39]/70 text-[#b5c7e8] border-[rgba(181,210,255,0.15)] hover:border-[#65d9ff]/50'
              }`}
            >
              <span>{cName}</span>
              <span className="text-[9px] opacity-75">({data.count})</span>
            </button>
          ))}
      </div>
    </div>
  );
}
