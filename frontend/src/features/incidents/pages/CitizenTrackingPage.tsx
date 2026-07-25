import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUIStore from '@store/uiStore';
import { api } from '@config/api';
import NotificationBell from '../../notifications/NotificationBell';
import { 
  FileText, Clock, CheckCircle2, Plus, LogOut, Building2
} from 'lucide-react';

export const CitizenTrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthUser } = useUIStore();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  const fetchUserIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/incidents');
      if (res.data.success) {
        const list = res.data.data.incidents || [];
        setIncidents(list);
        if (list.length > 0) {
          setSelectedIncident(list[0]);
        }
      }
    } catch (err) {
      console.error('[CitizenTrackingPage] Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserIncidents();
  }, []);

  const timelineSteps = ['Submitted', 'Verified', 'Assigned', 'In_Progress', 'Resolved'];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'Submitted': return 0;
      case 'Verified': return 1;
      case 'Assigned': return 2;
      case 'In_Progress': return 3;
      case 'Resolved': return 4;
      default: return 0;
    }
  };

  const getEtaBySeverity = (severity: string) => {
    switch (severity) {
      case 'Critical': return '6 Hours SLA';
      case 'High': return '12 Hours SLA';
      case 'Medium': return '24 Hours SLA';
      case 'Low': return '48 Hours SLA';
      default: return '24 Hours SLA';
    }
  };

  const statusColors: Record<string, string> = {
    Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
    Verified: 'bg-sky-50 text-sky-700 border-sky-200',
    Assigned: 'bg-amber-50 text-amber-700 border-amber-200',
    In_Progress: 'bg-blue-50 text-blue-700 border-blue-200',
    Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-white text-slate-800 relative overflow-x-hidden font-body">
      {/* Header */}
      <header className="border-b border-sky-100 bg-white/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-0 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-600/25 shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="truncate">
              <h1 className="text-xs sm:text-sm font-bold font-display text-slate-900 tracking-tight truncate">CityMind Complaint Portal</h1>
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 truncate">GHMC AI Decision Timelines & Status</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/citizen/report')}
              className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-sky-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">File New Report</span>
              <span className="sm:hidden">Report</span>
            </button>

            <NotificationBell />

            <div className="h-4 w-[1px] bg-slate-200" />

            <button
              onClick={() => {
                localStorage.clear();
                setAuthUser(null);
                navigate('/login');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black font-display text-slate-900 tracking-tight">Your Submitted Complaints</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Real-time AI verification status & resolution tracking</p>
          </div>
          <span className="px-3.5 py-1.5 bg-white border border-slate-200 text-xs font-mono font-semibold rounded-xl text-slate-600 shadow-sm">
            Total Reports: {incidents.length}
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-slate-400">
            Loading complaint history...
          </div>
        ) : incidents.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-xl max-w-md mx-auto my-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-900 mb-2">No Complaints Submitted Yet</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">Report civic hazards like potholes, water leaks, or waste overflow for AI processing.</p>
            <button
              onClick={() => navigate('/citizen/report')}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-sky-600/20"
            >
              Submit Your First Complaint
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List Column */}
            <div className="lg:col-span-1 space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc._id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all bg-white ${
                    selectedIncident?._id === inc._id
                      ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                      : 'border-slate-200 hover:border-sky-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2.5 py-0.5 border text-[10px] font-mono font-bold rounded-md uppercase tracking-wider ${statusColors[inc.status] || 'bg-slate-100 text-slate-600'}`}>
                      {inc.status?.replace('_', ' ') || 'Submitted'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{inc._id.substring(inc._id.length - 6)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{inc.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{inc.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                    <span className="font-mono text-sky-700 font-semibold">{inc.department}</span>
                    <span className="font-mono text-slate-600">{getEtaBySeverity(inc.severity)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tracking Detail Timeline Column */}
            <div className="lg:col-span-2">
              {selectedIncident ? (
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xl shadow-slate-200/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-sky-600 font-bold uppercase tracking-wider">
                        Incident Ticket #{selectedIncident._id}
                      </span>
                      <h2 className="text-xl font-black font-display text-slate-900 mt-1">{selectedIncident.title}</h2>
                    </div>
                    <span className={`px-3 py-1 border text-xs font-mono font-bold rounded-xl uppercase tracking-wider ${statusColors[selectedIncident.status] || 'bg-slate-100 text-slate-600'}`}>
                      {selectedIncident.status?.replace('_', ' ') || 'Submitted'}
                    </span>
                  </div>

                  {/* Overview Grid */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase font-semibold">Severity</span>
                      <span className="text-xs font-bold text-slate-800">{selectedIncident.severity}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase font-semibold">Department</span>
                      <span className="text-xs font-bold text-slate-800">{selectedIncident.department}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-mono text-slate-400 uppercase font-semibold">Resolution SLA</span>
                      <span className="text-xs font-bold text-sky-700">{getEtaBySeverity(selectedIncident.severity)}</span>
                    </div>
                  </div>

                  {/* StitchMCP Case Resolution Roadmap Horizontal Banner */}
                  <div className="p-4 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50/60 border border-sky-200/80 rounded-2xl space-y-3">
                    <h4 className="text-xs font-mono font-bold text-sky-800 uppercase tracking-wider">
                      Case Resolution Roadmap
                    </h4>
                    <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                      {timelineSteps.map((step, idx) => {
                        const currentStepIndex = getStepIndex(selectedIncident.status);
                        const isDone = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;

                        return (
                          <div key={step} className="flex flex-col items-center gap-1 flex-1 min-w-[70px]">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                              isCurrent
                                ? 'bg-sky-600 text-white ring-4 ring-sky-500/20 animate-pulse'
                                : isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                              {isDone ? '✓' : idx + 1}
                            </div>
                            <span className={`text-[10px] font-mono font-bold text-center ${isDone ? 'text-slate-800' : 'text-slate-400'}`}>
                              {step.replace('_', ' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Timeline Stepper */}
                  <div>
                    <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-1.5 font-bold">
                      <Clock className="w-4 h-4 text-sky-600" /> Tracking Progress Details
                    </h3>

                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                      {timelineSteps.map((step, idx) => {
                        const currentStepIndex = getStepIndex(selectedIncident.status);
                        const isDone = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;

                        const stepLabels: Record<string, { title: string; desc: string }> = {
                          Submitted: { title: '1. Complaint Submitted', desc: 'Received by AI CITY Brain gateway' },
                          Verified: { title: '2. AI Verified', desc: 'Visual AI & GPS verification completed' },
                          Assigned: { title: '3. Assigned to Department', desc: `Routed to ${selectedIncident.department} department` },
                          In_Progress: { title: '4. Resolution In Progress', desc: 'Field team dispatched to location' },
                          Resolved: { title: '5. Complaint Resolved', desc: 'Work completed and verified' }
                        };

                        return (
                          <div key={step} className="relative flex items-start gap-4">
                            <div className={`absolute -left-[23px] top-0.5 w-5 h-5 rounded-full border text-[10px] font-mono flex items-center justify-center transition-all ${
                              isCurrent
                                ? 'bg-sky-600 border-sky-600 text-white ring-4 ring-sky-500/20 animate-pulse'
                                : isDone
                                ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                                : 'bg-white border-slate-300 text-slate-300'
                            }`}>
                              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                            </div>

                            <div>
                              <h4 className={`text-xs font-bold ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                                {stepLabels[step].title}
                              </h4>
                              <p className={`text-[11px] ${isDone ? 'text-slate-500' : 'text-slate-400'}`}>
                                {stepLabels[step].desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status History Logs */}
                  {selectedIncident.statusHistory && selectedIncident.statusHistory.length > 0 && (
                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3 font-semibold">Audit Logs</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {selectedIncident.statusHistory.map((h: any, i: number) => (
                          <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                            <div>
                              <span className="font-mono text-sky-700 font-bold text-[10px] mr-2">[{h.status}]</span>
                              <span className="text-slate-600">{h.note}</span>
                            </div>
                            <span className="font-mono text-[9px] text-slate-400">
                              {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-12 text-center rounded-3xl border border-slate-200">
                  <p className="text-xs text-slate-500 font-mono">Select a complaint from the list to view its real-time timeline.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CitizenTrackingPage;
