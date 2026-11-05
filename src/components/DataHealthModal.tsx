import { X, CheckCircle, Database, ShieldAlert, Cpu, GitMerge } from 'lucide-react';
import { DataQualityReport } from '../types/mission';

interface DataHealthModalProps {
  report: DataQualityReport;
  isOpen: boolean;
  onClose: () => void;
}

export default function DataHealthModal({ report, isOpen, onClose }: DataHealthModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#0b1633] border border-[#65d9ff]/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(181,210,255,0.15)]">
          <div className="flex items-center gap-2.5">
            <Database className="text-[#65d9ff]" size={20} />
            <div>
              <h3 className="font-semibold text-lg text-[#f0f5ff]">Data Validation & Schema Relationships</h3>
              <p className="text-xs text-[#9ba9c9] font-mono">Tableau-inspired Data Quality & Relationship Architecture</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#14234b] text-[#9ba9c9] hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Data Quality Overview */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#101f46] p-3 rounded-xl border border-[rgba(181,210,255,0.1)]">
            <span className="text-[10px] text-[#9ba9c9] font-mono uppercase block">Total Records</span>
            <strong className="text-xl text-[#65d9ff]">{report.totalRecords.toLocaleString()}</strong>
          </div>
          <div className="bg-[#101f46] p-3 rounded-xl border border-[rgba(181,210,255,0.1)]">
            <span className="text-[10px] text-[#9ba9c9] font-mono uppercase block">Valid Dates</span>
            <strong className="text-xl text-[#5ee5ad]">{report.validDates.toLocaleString()}</strong>
            <small className="text-[9px] text-[#9ba9c9] block font-mono">
              ({((report.validDates / (report.totalRecords || 1)) * 100).toFixed(1)}%)
            </small>
          </div>
          <div className="bg-[#101f46] p-3 rounded-xl border border-[rgba(181,210,255,0.1)]">
            <span className="text-[10px] text-[#9ba9c9] font-mono uppercase block">Enriched Costs</span>
            <strong className="text-xl text-[#ffbf69]">{report.recordsWithCost.toLocaleString()}</strong>
            <small className="text-[9px] text-[#9ba9c9] block font-mono">From space_missions.csv</small>
          </div>
          <div className="bg-[#101f46] p-3 rounded-xl border border-[rgba(181,210,255,0.1)]">
            <span className="text-[10px] text-[#9ba9c9] font-mono uppercase block">Completeness</span>
            <strong className="text-xl text-[#df7cff]">{report.completenessRate}%</strong>
            <small className="text-[9px] text-[#5ee5ad] block font-mono">Production Ready</small>
          </div>
        </div>

        {/* Dataset Relationship Diagram */}
        <div className="mt-6 p-4 rounded-xl bg-[#09132b] border border-[rgba(181,210,255,0.15)]">
          <div className="flex items-center gap-2 mb-3">
            <GitMerge className="text-[#a98bff]" size={16} />
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#a98bff] font-semibold">
              In-Memory Dataset Join Architecture
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#0e1d42] border border-[#3b62ad]/40">
              <span className="text-[#65d9ff] font-mono font-bold block mb-1">launches.csv</span>
              <p className="text-[11px] text-[#9ba9c9]">7,651 primary launch events, COSPAR IDs, dates, rocket type, launch sites, mission outcomes.</p>
              <div className="mt-2 text-[9px] font-mono text-[#70dbff] bg-[#14295c] px-2 py-0.5 rounded inline-block">
                Key: launch_id (UUID)
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1d42] border border-[#3b62ad]/40">
              <span className="text-[#5ee5ad] font-mono font-bold block mb-1">satellites.csv</span>
              <p className="text-[11px] text-[#9ba9c9]">5,500+ NORAD catalogued payloads, orbital parameters, operators, and decay timelines.</p>
              <div className="mt-2 text-[9px] font-mono text-[#5ee5ad] bg-[#0e3b2e] px-2 py-0.5 rounded inline-block">
                Joined: 1:N on launch_id
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1d42] border border-[#3b62ad]/40">
              <span className="text-[#ffbf69] font-mono font-bold block mb-1">space_missions.csv</span>
              <p className="text-[11px] text-[#9ba9c9]">4,324 historical missions with validated launch cost data ($M) in Rocket column.</p>
              <div className="mt-2 text-[9px] font-mono text-[#ffbf69] bg-[#422e0a] px-2 py-0.5 rounded inline-block">
                Enriched on (Date, Company)
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Validation Layer */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="text-[#65d9ff]" size={16} />
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#cfd8ed] font-semibold">
              Active Data Validation & Guardrails
            </h4>
          </div>

          <ul className="text-xs space-y-1.5 text-[#9ba9c9]">
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="text-[#5ee5ad] mt-0.5 flex-shrink-0" />
              <span><b>Safe Date Ingestion:</b> Non-standard date strings are validated; invalid dates default to `null` to prevent NaN year crashes.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="text-[#5ee5ad] mt-0.5 flex-shrink-0" />
              <span><b>Missing Numerical Value Shield:</b> Unrecorded launch costs are cleanly filtered from box plots and cost statistics rather than falsified.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="text-[#5ee5ad] mt-0.5 flex-shrink-0" />
              <span><b>Zero-Division Protection:</b> KPI calculations like Success Rate and Cost Averages employ safe guards (`total ? sum/total : '—'`).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="text-[#5ee5ad] mt-0.5 flex-shrink-0" />
              <span><b>Geographic Normalization:</b> Country names extracted from sites are normalized and assigned to 7 global continental regions.</span>
            </li>
          </ul>
        </div>

        {/* Calculated Fields Methodology */}
        <div className="mt-5 p-4 rounded-xl bg-[#09132b] border border-[rgba(181,210,255,0.15)]">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="text-[#ffbf69]" size={15} />
            <span className="text-xs font-mono uppercase tracking-wider text-[#ffbf69] font-semibold">
              Calculated Metrics Methodology
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#9ba9c9]">
            <div className="bg-[#0c1938] p-2 rounded border border-[rgba(181,210,255,0.08)]">
              <span className="text-[#65d9ff] block text-[11px]">Success Rate (%)</span>
              <code className="text-[10px] text-[#e2ecff]">(Successful Launches / Total Launches) × 100</code>
            </div>
            <div className="bg-[#0c1938] p-2 rounded border border-[rgba(181,210,255,0.08)]">
              <span className="text-[#65d9ff] block text-[11px]">Average Cost ($M)</span>
              <code className="text-[10px] text-[#e2ecff]">Sum(Recorded Costs) / Count(Missions with Cost)</code>
            </div>
            <div className="bg-[#0c1938] p-2 rounded border border-[rgba(181,210,255,0.08)]">
              <span className="text-[#65d9ff] block text-[11px]">Box Plot IQR Fence</span>
              <code className="text-[10px] text-[#e2ecff]">Q1 - 1.5×IQR (Min) to Q3 + 1.5×IQR (Max)</code>
            </div>
            <div className="bg-[#0c1938] p-2 rounded border border-[rgba(181,210,255,0.08)]">
              <span className="text-[#65d9ff] block text-[11px]">Linear Trend Line</span>
              <code className="text-[10px] text-[#e2ecff]">Ordinary Least Squares: y = mx + b</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#2b4c8a] hover:bg-[#3962b3] text-white text-xs font-medium transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

