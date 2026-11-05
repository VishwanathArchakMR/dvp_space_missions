import { useState, useMemo } from 'react';
import { Layers, ChevronDown, ChevronUp, Hash, Calendar, MapPin, Building, Flag, CheckCircle2, DollarSign, Rocket } from 'lucide-react';
import { Mission } from '../types/mission';
import { isSuccess, isFailure } from '../utils/data';

interface TableauShelfProps {
  missions: Mission[];
  onSelectDimension?: (dim: string, val: string) => void;
}

export default function TableauShelf({ missions }: TableauShelfProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Compute live distinct counts and aggregations
  const stats = useMemo(() => {
    const total = missions.length;
    const countries = new Set(missions.map(m => m.country).filter(Boolean)).size;
    const companies = new Set(missions.map(m => m.company).filter(Boolean)).size;
    const sites = new Set(missions.map(m => m.site).filter(Boolean)).size;
    const rockets = new Set(missions.map(m => m.rocket).filter(Boolean)).size;
    const outcomes = new Set(missions.map(m => m.outcome).filter(Boolean)).size;
    const regions = new Set(missions.map(m => m.region).filter(Boolean)).size;
    const years = new Set(missions.map(m => m.year).filter(Boolean)).size;
    const months = new Set(missions.map(m => m.month).filter(Boolean)).size;

    const successCount = missions.filter(m => isSuccess(m.outcome)).length;
    const failCount = missions.filter(m => isFailure(m.outcome)).length;
    const successRate = total ? ((successCount / total) * 100).toFixed(1) : '0';
    
    const costRecords = missions.filter(m => m.cost !== null && m.cost > 0);
    const totalCost = costRecords.reduce((s, m) => s + (m.cost || 0), 0);
    const avgCost = costRecords.length ? (totalCost / costRecords.length).toFixed(1) : '—';
    const totalPayloads = missions.reduce((s, m) => s + m.payloadCount, 0);

    return {
      dimensions: [
        { name: 'Mission Detail', type: 'String', icon: Rocket, distinct: total, role: 'Discrete (Categorical)' },
        { name: 'Country', type: 'Geographic', icon: Flag, distinct: countries, role: 'Discrete (Geographic)' },
        { name: 'Region / Continent', type: 'Geographic Group', icon: MapPin, distinct: regions, role: 'Discrete (Group)' },
        { name: 'Organization / Company', type: 'String', icon: Building, distinct: companies, role: 'Discrete (Categorical)' },
        { name: 'Launch Site', type: 'Geographic', icon: MapPin, distinct: sites, role: 'Discrete (Geographic)' },
        { name: 'Vehicle / Rocket', type: 'String', icon: Rocket, distinct: rockets, role: 'Discrete (Categorical)' },
        { name: 'Mission Status / Outcome', type: 'String', icon: CheckCircle2, distinct: outcomes, role: 'Discrete (Categorical)' },
        { name: 'Launch Year', type: 'Date / Integer', icon: Calendar, distinct: years, role: 'Discrete (Time Dimension)' },
        { name: 'Launch Month', type: 'Date / Categorical', icon: Calendar, distinct: months, role: 'Discrete (Seasonality)' }
      ],
      measures: [
        { name: 'Number of Missions', type: 'Integer (Count)', formula: 'COUNT([Mission])', value: total.toLocaleString(), agg: 'SUM / COUNT' },
        { name: 'Success Count', type: 'Integer', formula: 'SUM(IF [Outcome]=\'Success\' THEN 1 END)', value: successCount.toLocaleString(), agg: 'COUNT' },
        { name: 'Failure Count', type: 'Integer', formula: 'SUM(IF [Outcome]=\'Failure\' THEN 1 END)', value: failCount.toLocaleString(), agg: 'COUNT' },
        { name: 'Success Rate (%)', type: 'Float (Percentage)', formula: '([Success Count] / [Total Missions]) * 100', value: `${successRate}%`, agg: 'CALCULATED RATIO' },
        { name: 'Catalogued Payloads', type: 'Integer', formula: 'SUM([payloadCount])', value: totalPayloads.toLocaleString(), agg: 'SUM' },
        { name: 'Mission Cost ($M)', type: 'Currency (USD M)', formula: 'SUM([cost])', value: costRecords.length ? `$${Math.round(totalCost).toLocaleString()}M` : 'Data Joined', agg: 'SUM' },
        { name: 'Average Mission Cost ($M)', type: 'Currency (USD M)', formula: 'AVG([cost])', value: avgCost !== '—' ? `$${avgCost}M` : '—', agg: 'AVG' }
      ]
    };
  }, [missions]);

  return (
    <div className="tableau-shelf border border-[rgba(181,210,255,0.18)] bg-[rgba(16,28,57,0.7)] backdrop-blur-md rounded-2xl mb-4 overflow-hidden shadow-lg transition-all">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition select-none"
      >
        <div className="flex items-center gap-2.5">
          <Layers className="text-[#65d9ff]" size={16} />
          <span className="font-mono text-xs tracking-wider uppercase text-[#65d9ff] font-semibold">
            Tableau Data Architecture · Dimensions & Measures Schema
          </span>
          <span className="text-[10px] font-mono text-[#9ba9c9] bg-[#0e1b38] px-2 py-0.5 rounded border border-[rgba(181,210,255,0.15)]">
            {stats.dimensions.length} Dimensions · {stats.measures.length} Measures
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#9ba9c9]">
          <span className="text-[11px] font-mono hidden sm:inline">{isOpen ? 'Collapse Schema' : 'Explore Data Fields'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (
        <div className="p-5 border-t border-[rgba(181,210,255,0.12)] bg-[#071025]/60 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dimensions Shelf (Blue - Tableau Convention) */}
          <div className="shelf-group">
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-[#417db5]/40">
              <span className="text-xs font-mono font-bold tracking-wider text-[#79c2ff] uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#2b72d6] inline-block"></span>
                Dimensions (Categorical / Qualitative)
              </span>
              <span className="text-[10px] text-[#9ba9c9] font-mono">Discrete Fields</span>
            </div>
            <div className="space-y-2">
              {stats.dimensions.map((dim, i) => {
                const IconComponent = dim.icon;
                return (
                  <div 
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0e2148]/60 border border-[#2b72d6]/30 text-xs hover:border-[#65d9ff]/60 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded flex items-center justify-center bg-[#1d3d75] text-[#79c2ff]">
                        <IconComponent size={12} />
                      </span>
                      <span className="font-medium text-[#e2ecff]">{dim.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-[#8ba2cc]">{dim.type}</span>
                      <span className="bg-[#122852] text-[#79c2ff] px-2 py-0.5 rounded text-[10px] border border-[#2b72d6]/40">
                        {dim.distinct} distinct
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Measures Shelf (Green - Tableau Convention) */}
          <div className="shelf-group">
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-[#2ea879]/40">
              <span className="text-xs font-mono font-bold tracking-wider text-[#5ee5ad] uppercase flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1fa86f] inline-block"></span>
                Measures (Quantitative / Continuous)
              </span>
              <span className="text-[10px] text-[#9ba9c9] font-mono">Continuous Aggregations</span>
            </div>
            <div className="space-y-2">
              {stats.measures.map((meas, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0d2a2d]/60 border border-[#1fa86f]/30 text-xs hover:border-[#5ee5ad]/60 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded flex items-center justify-center bg-[#14483a] text-[#5ee5ad]">
                      {meas.name.includes('$') ? <DollarSign size={12} /> : <Hash size={12} />}
                    </span>
                    <div>
                      <span className="font-medium text-[#e2ecff]">{meas.name}</span>
                      <small className="block text-[9px] text-[#78a999] font-mono">{meas.formula}</small>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <strong className="text-[#5ee5ad] text-xs">{meas.value}</strong>
                    <span className="block text-[9px] text-[#78a999]">{meas.agg}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

