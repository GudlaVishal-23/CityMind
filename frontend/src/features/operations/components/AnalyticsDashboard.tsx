import { CheckCircle2, Clock, Layers, AlertTriangle } from 'lucide-react';

interface AnalyticsDashboardProps {
  data: {
    totalComplaints?: number;
    pendingCount?: number;
    resolvedCount?: number;
    avgResolutionHours?: number;
    categoryDistribution?: Record<string, number>;
    priorityDistribution?: Record<string, number>;
  };
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  const {
    totalComplaints = 0,
    pendingCount = 0,
    resolvedCount = 0,
    avgResolutionHours = 0,
    categoryDistribution = {},
    priorityDistribution = {}
  } = data;

  const priorityColors: Record<string, string> = {
    Critical: 'bg-destructive',
    High: 'bg-warning',
    Medium: 'bg-yellow-500',
    Low: 'bg-safe'
  };

  const totalCatSum = Object.values(categoryDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Stats KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Total Complaints</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-2xl font-black font-display text-slate-900">{totalComplaints}</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Pending Queue</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-black font-display text-amber-600">{pendingCount}</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black font-display text-emerald-600">{resolvedCount}</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Avg Resolution SLA</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-2xl font-black font-display text-slate-900">{avgResolutionHours}h</span>
        </div>
      </div>

      {/* Distributions Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
          <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
            CityMind Category Distribution
          </h4>

          <div className="space-y-2.5">
            {Object.keys(categoryDistribution).length === 0 ? (
              <p className="text-xs font-mono text-slate-400">No data available.</p>
            ) : (
              Object.entries(categoryDistribution).map(([cat, count]) => {
                const pct = Math.round((count / totalCatSum) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono font-bold">
                      <span className="text-slate-800">{cat}</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
          <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
            Priority Distribution
          </h4>

          <div className="space-y-2.5">
            {['Critical', 'High', 'Medium', 'Low'].map((sev) => {
              const count = priorityDistribution[sev] || 0;
              const pct = totalComplaints > 0 ? Math.round((count / totalComplaints) * 100) : 0;
              return (
                <div key={sev} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span className="text-slate-800">{sev} Priority</span>
                    <span className="text-slate-500">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${priorityColors[sev] || 'bg-sky-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
