import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Clock, TrendingUp, Plus, X, Download } from 'lucide-react';
import { api } from '../services/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const Progress = () => {
  const [progressEntries, setProgressEntries] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newLog, setNewLog] = useState({ subjectId: '', hoursStudied: '' });

  const fetchData = useCallback(async () => {
    try {
      const [progressRes, subjectsRes] = await Promise.all([
        api.get('/progress'),
        api.get('/subjects')
      ]);
      setProgressEntries(progressRes.data);
      setSubjects(subjectsRes.data);
      if (subjectsRes.data.length > 0) {
        setNewLog(prev => ({ ...prev, subjectId: subjectsRes.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/progress', {
        subjectId: newLog.subjectId,
        hoursStudied: parseFloat(newLog.hoursStudied)
      });
      setShowLogForm(false);
      setNewLog(prev => ({ ...prev, hoursStudied: '' }));
      fetchData();
    } catch (error) {
      console.error('Failed to log progress', error);
      alert('Failed to log progress.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    window.print();
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading progress...</div>;

  return (
    <div className="space-y-6" id="report-content">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Progress Tracker</h2>
          <p className="text-gray-500 text-sm mt-1">Monitor your mastery and log manual study sessions.</p>
        </div>
        <div id="report-actions" className="flex items-center gap-3">
          <button 
            onClick={generatePDF}
            className="px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 transition flex items-center gap-2 font-medium bg-white text-gray-700 hover:bg-gray-50"
          >
            <Download size={18} /> Export PDF
          </button>
          <button 
            onClick={() => setShowLogForm(!showLogForm)}
            className={`px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 font-medium ${showLogForm ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {showLogForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Log Study Time</>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showLogForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleLogProgress} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5 max-w-2xl"
          >
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2">Log Manual Session</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select 
                  value={newLog.subjectId} 
                  onChange={e => setNewLog({...newLog, subjectId: e.target.value})}
                  className="w-full rounded-xl border-gray-300 shadow-sm border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
                  required
                >
                  {subjects.length === 0 ? <option value="">No subjects found</option> : null}
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Studied</label>
                <input 
                  type="number" 
                  step="0.1" 
                  min="0.1"
                  value={newLog.hoursStudied} 
                  onChange={e => setNewLog({...newLog, hoursStudied: e.target.value})} 
                  required 
                  placeholder="e.g. 1.5"
                  className="w-full rounded-xl border-gray-300 shadow-sm border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={saving || subjects.length === 0} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-70">
                {saving ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Mastery */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={24} className="text-blue-500" />
            <h3 className="text-xl font-bold text-gray-800">Subject Mastery</h3>
          </div>
          
          <div className="space-y-6">
            {subjects.length === 0 ? (
              <div className="text-center py-10">
                <Book size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No subjects found.</p>
                <p className="text-gray-400 text-sm mt-1">Add subjects to track mastery.</p>
              </div>
            ) : (
              subjects.map(subject => (
                <div key={subject.id} className="group">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${subject.completionRate > 80 ? 'bg-green-500' : subject.completionRate > 40 ? 'bg-blue-500' : 'bg-orange-500'}`} />
                      {subject.name}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{Math.round(subject.completionRate || 0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, subject.completionRate || 0)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${subject.completionRate > 80 ? 'bg-green-500' : subject.completionRate > 40 ? 'bg-blue-500' : 'bg-orange-500'}`} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">Recent Logs</h3>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              {progressEntries.length} Total
            </span>
          </div>
          
          <div className="overflow-y-auto max-h-[400px]">
            {progressEntries.length === 0 ? (
              <div className="text-center py-16">
                <Clock size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No study logs yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {progressEntries.map(entry => (
                  <div key={entry.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Book size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{entry.subject?.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-bold shadow-sm">
                        +{entry.hoursStudied} hr
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
