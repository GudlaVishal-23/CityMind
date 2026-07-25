import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUIStore from '@store/uiStore';
import { api } from '@config/api';
import NotificationBell from '../../notifications/NotificationBell';
import { 
  Check, X, HelpCircle, RefreshCw, 
  LogOut, CheckCircle2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const OfficerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useUIStore();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  // Modal forms state
  const [actionType, setActionType] = useState<'accept' | 'reject' | 'info' | 'status' | 'close' | 'feedback' | null>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [statusInput, setStatusInput] = useState<string>('In_Progress');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Feedback state
  const [officerSeverity, setOfficerSeverity] = useState('Medium');
  const [officerDept, setOfficerDept] = useState('WATER_BOARD');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/incidents');
      if (res.data.success) {
        setIncidents(res.data.data.incidents || []);
      }
    } catch (err) {
      console.error('[OfficerDashboardPage] Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !actionType) return;
    setSubmitting(true);
    setError(null);

    try {
      let endpoint = '';
      let body: any = {};

      switch (actionType) {
        case 'accept':
          endpoint = `/officer/incidents/${selectedIncident._id}/accept`;
          break;
        case 'reject':
          endpoint = `/officer/incidents/${selectedIncident._id}/reject`;
          body = { reason: reasonInput };
          break;
        case 'info':
          endpoint = `/officer/incidents/${selectedIncident._id}/request-info`;
          body = { message: reasonInput };
          break;
        case 'status':
          endpoint = `/officer/incidents/${selectedIncident._id}/status`;
          body = { status: statusInput, note: reasonInput };
          break;
        case 'close':
          endpoint = `/officer/incidents/${selectedIncident._id}/close`;
          body = { resolutionNotes: reasonInput };
          break;
        case 'feedback':
          endpoint = `/feedback`;
          body = {
            incidentId: selectedIncident._id,
            aiSeverity: selectedIncident.severity,
            officerSeverity,
            aiDepartment: selectedIncident.department,
            officerDepartment: officerDept,
            reason: reasonInput
          };
          break;
      }

      const res = await api.post(endpoint, body);
      if (res.data.success) {
        setActionType(null);
        setReasonInput('');
        fetchIncidents();
        if (actionType !== 'feedback') {
          setSelectedIncident(res.data.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors: Record<string, string> = {
    Submitted: 'bg-muted/40 text-muted-foreground border-muted/60',
    Verified: 'bg-primary/10 text-primary border-primary/20',
    Assigned: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    In_Progress: 'bg-warning/10 text-warning border-warning/20',
    Resolved: 'bg-safe/10 text-safe border-safe/20'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100 flex flex-col font-body text-slate-800">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center font-black text-white font-display text-xs sm:text-sm shadow-md shadow-sky-500/20 shrink-0">
              CM
            </div>
            <div className="truncate">
              <h1 className="text-xs sm:text-base font-black font-display text-slate-900 tracking-tight truncate">Municipal Officer Portal</h1>
              <p className="text-[9px] sm:text-[10px] font-mono font-bold text-sky-800 truncate">{authUser?.name || 'Inspector Ramesh Kumar'} — GHMC Ops</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/80 text-xs font-mono font-bold text-slate-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="truncate max-w-[120px]">{authUser?.name || 'Inspector Ramesh Kumar'}</span>
              <span className="text-[9px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md uppercase font-extrabold">Active</span>
            </div>
            <NotificationBell />
            <div className="h-4 w-[1px] bg-slate-200" />
            <button
              onClick={() => {
                localStorage.clear();
                setAuthUser(null);
                navigate('/login');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-xl"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black font-display text-slate-900">Assigned Complaint Queue</h2>
            <p className="text-xs text-slate-500 font-mono font-bold">Accept, assign, update, and resolve civic complaints in real-time</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-muted-foreground">
            Loading complaint queue...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List Queue */}
            <div className="lg:col-span-1 space-y-4">
              {incidents.map((inc) => (
                <div
                  key={inc._id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setOfficerSeverity(inc.severity);
                    setOfficerDept(inc.department);
                  }}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    selectedIncident?._id === inc._id
                      ? 'border-sky-400 bg-sky-50/90 shadow-md shadow-sky-500/10 ring-2 ring-sky-400/20'
                      : 'bg-white border-slate-200/80 hover:border-sky-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2.5 py-0.5 border text-[10px] font-mono font-bold rounded-lg uppercase tracking-wider ${statusColors[inc.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                      {inc.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      #{inc._id.substring(inc._id.length - 6)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{inc.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 font-medium">{inc.description}</p>

                  <div className="flex items-center justify-between text-[11px] border-t border-slate-200/60 pt-3">
                    <span className="font-mono text-sky-700 font-bold">{inc.department}</span>
                    <span className="font-mono text-amber-700 font-bold">{inc.severity}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Officer Action Console */}
            <div className="lg:col-span-2">
              {selectedIncident ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-sky-700 uppercase font-bold tracking-wider">
                        Complaint #{selectedIncident._id}
                      </span>
                      <h2 className="text-xl font-black font-display text-slate-900 mt-1">{selectedIncident.title}</h2>
                    </div>
                    <span className={`px-3 py-1 border text-xs font-mono font-bold rounded-xl uppercase tracking-wider ${statusColors[selectedIncident.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                      {selectedIncident.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-medium leading-relaxed">
                    {selectedIncident.description}
                  </p>

                  {/* Actions Grid */}
                  <div className="border-t border-muted/40 pt-4">
                    <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Officer Workflow Actions</h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => setActionType('accept')}
                        className="py-3 px-4 bg-safe/10 border border-safe/30 text-safe rounded-xl font-medium text-xs hover:bg-safe/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Accept Complaint
                      </button>

                      <button
                        onClick={() => setActionType('status')}
                        className="py-3 px-4 bg-warning/10 border border-warning/30 text-warning rounded-xl font-medium text-xs hover:bg-warning/20 transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Update Status
                      </button>

                      <button
                        onClick={() => setActionType('info')}
                        className="py-3 px-4 bg-primary/10 border border-primary/30 text-primary rounded-xl font-medium text-xs hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4" /> Request Info
                      </button>

                      <button
                        onClick={() => setActionType('close')}
                        className="py-3 px-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl font-medium text-xs hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Close & Resolve
                      </button>

                      <button
                        onClick={() => setActionType('reject')}
                        className="py-3 px-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl font-medium text-xs hover:bg-destructive/20 transition-all flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> Reject Report
                      </button>

                      <button
                        onClick={() => setActionType('feedback')}
                        className="py-3 px-4 bg-muted/40 border border-muted/60 text-white rounded-xl font-medium text-xs hover:bg-muted/60 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4 text-primary" /> AI Feedback
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Action Form Modal Panel */}
                  <AnimatePresence>
                    {actionType && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleExecuteAction}
                        className="p-5 bg-card/90 border border-primary/30 rounded-2xl space-y-4 relative"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                            Action: {actionType.toUpperCase()}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setActionType(null)}
                            className="text-muted-foreground hover:text-white text-xs"
                          >
                            Cancel
                          </button>
                        </div>

                        {error && (
                          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl">
                            {error}
                          </div>
                        )}

                        {actionType === 'status' && (
                          <div>
                            <label className="block text-xs font-mono text-muted-foreground mb-1">New Status</label>
                            <select
                              value={statusInput}
                              onChange={(e) => setStatusInput(e.target.value)}
                              className="w-full p-2.5 bg-background border border-muted/50 rounded-xl text-xs text-white"
                            >
                              <option value="In_Progress">In Progress</option>
                              <option value="Assigned">Assigned</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </div>
                        )}

                        {actionType === 'feedback' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-mono text-muted-foreground mb-1">Officer Severity</label>
                              <select
                                value={officerSeverity}
                                onChange={(e) => setOfficerSeverity(e.target.value)}
                                className="w-full p-2.5 bg-background border border-muted/50 rounded-xl text-xs text-white"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-mono text-muted-foreground mb-1">Officer Department</label>
                              <select
                                value={officerDept}
                                onChange={(e) => setOfficerDept(e.target.value)}
                                className="w-full p-2.5 bg-background border border-muted/50 rounded-xl text-xs text-white"
                              >
                                <option value="PWD">PWD</option>
                                <option value="ELECTRICITY">ELECTRICITY</option>
                                <option value="WATER_BOARD">WATER_BOARD</option>
                                <option value="SANITATION">SANITATION</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-mono text-muted-foreground mb-1">
                            {actionType === 'accept' ? 'Acceptance Note (Optional)' : 'Reason / Resolution Notes (Required)'}
                          </label>
                          <textarea
                            rows={3}
                            required={actionType !== 'accept'}
                            value={reasonInput}
                            onChange={(e) => setReasonInput(e.target.value)}
                            placeholder="Enter notes or justification..."
                            className="w-full p-3 bg-background border border-muted/50 rounded-xl text-xs text-white placeholder:text-muted-foreground/50"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-2.5 bg-primary text-white font-medium text-xs rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                        >
                          {submitting ? 'Executing...' : 'Submit Action'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="glass-card p-12 text-center rounded-2xl border border-muted/50">
                  <p className="text-xs text-muted-foreground font-mono">Select a complaint from the queue to view and execute officer workflow actions.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OfficerDashboardPage;
