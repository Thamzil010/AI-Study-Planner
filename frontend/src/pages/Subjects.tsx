import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, BookOpen, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

const Subjects = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSubject, setNewSubject] = useState({ 
    name: '', 
    priority: 5, 
    difficulty: 'MEDIUM', 
    topic: '', 
    estimatedStudyHours: 2 
  });

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch (error) {
      console.error('Failed to fetch subjects', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    fetchSubjects();
  }, [fetchSubjects]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/subjects', newSubject);
      setShowAddForm(false);
      setNewSubject({ name: '', priority: 5, difficulty: 'MEDIUM', topic: '', estimatedStudyHours: 2 });
      fetchSubjects();
    } catch (error) {
      console.error('Failed to add subject', error);
      alert('Failed to add subject.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchSubjects();
    } catch (error) {
      console.error('Failed to delete subject', error);
    }
  };

  const completeSubject = async (id: string) => {
    if (!confirm('Are you sure you want to mark this subject as completed? It will be removed from this view.')) return;
    try {
      await api.put(`/subjects/${id}`, { completionRate: 100 });
      fetchSubjects();
    } catch (error) {
      console.error('Failed to complete subject', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Subjects</h2>
          <p className="text-gray-500 text-sm mt-1">Manage what you want to study and let AI schedule it for you.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 shadow-md transition flex items-center gap-2 font-medium"
        >
          {showAddForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add Subject</>}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input type="text" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} required 
                  className="w-full rounded-xl border-gray-300 shadow-sm border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="e.g., Mathematics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specific Topic (Optional)</label>
                <input type="text" value={newSubject.topic} onChange={e => setNewSubject({...newSubject, topic: e.target.value})}
                  className="w-full rounded-xl border-gray-300 shadow-sm border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="e.g., Calculus Chapters 1-3" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
                <input type="number" min="1" max="10" value={newSubject.priority} onChange={e => setNewSubject({...newSubject, priority: parseInt(e.target.value) || 5})}
                  className="w-full rounded-xl border-gray-300 shadow-sm border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select value={newSubject.difficulty} onChange={e => setNewSubject({...newSubject, difficulty: e.target.value})}
                  className="w-full rounded-xl border-gray-300 shadow-sm border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white">
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Est. Study Hours</label>
                <input type="number" min="0.5" step="0.5" value={newSubject.estimatedStudyHours} onChange={e => setNewSubject({...newSubject, estimatedStudyHours: parseFloat(e.target.value) || 2})}
                  className="w-full rounded-xl border-gray-300 shadow-sm border p-3 focus:ring-2 focus:ring-blue-500 outline-none transition" />
              </div>
            </div>
            
            <div className="pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition font-medium disabled:opacity-70">
                {saving ? 'Saving...' : 'Save Subject'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading subjects...</div>
        ) : subjects.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
            <BookOpen size={48} className="text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-700">No subjects yet</h3>
            <p className="text-gray-500 mt-2">Add your first subject to let the AI create your study plan.</p>
          </div>
        ) : (
          subjects.map((subject, index) => (
            <motion.div 
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative group"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{subject.name}</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => completeSubject(subject.id)}
                      className="text-gray-400 hover:text-green-500 transition opacity-0 group-hover:opacity-100"
                      title="Mark as Completed"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button 
                      onClick={() => deleteSubject(subject.id)}
                      className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
                
                {subject.topic && (
                  <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg line-clamp-2 border border-gray-100">
                    {subject.topic}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1
                    ${subject.priority >= 8 ? 'bg-red-50 text-red-600 border border-red-100' : 
                      subject.priority >= 5 ? 'bg-yellow-50 text-yellow-600 border border-yellow-100' : 
                      'bg-green-50 text-green-600 border border-green-100'}`}
                  >
                    <AlertCircle size={12} />
                    Priority {subject.priority}/10
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    {subject.difficulty}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1">
                    <Clock size={12} />
                    {subject.estimatedStudyHours}h est.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500 font-medium">
                    <span>Progress</span>
                    <span>{subject.completionRate || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.completionRate || 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="bg-blue-500 h-full rounded-full" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Subjects;
