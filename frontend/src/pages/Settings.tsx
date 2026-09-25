import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { Settings, Clock, Briefcase, ChevronRight } from 'lucide-react';

const Preferences = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    semester: 1,
    dailyStudyHours: 4,
    studyStartTime: '08:00',
    studyEndTime: '22:00',
    hasWorkingHours: false,
    workStartTime: '09:00',
    workEndTime: '17:00'
  });

  const fetchPreferences = useCallback(async () => {
    try {
      const { data } = await api.get('/users/preferences');
      if (data) {
        setFormData({
          name: data.name || '',
          department: data.department || '',
          semester: data.semester || 1,
          dailyStudyHours: data.dailyStudyHours || 4,
          studyStartTime: data.studyStartTime || '08:00',
          studyEndTime: data.studyEndTime || '22:00',
          hasWorkingHours: data.hasWorkingHours || false,
          workStartTime: data.workStartTime || '09:00',
          workEndTime: data.workEndTime || '17:00'
        });
      }
    } catch (error) {
      console.error('Failed to fetch preferences', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    fetchPreferences();
  }, [fetchPreferences]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/preferences', formData);
      navigate('/');
    } catch (error) {
      console.error('Failed to update preferences', error);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 flex justify-center items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-blue-600 p-8 text-white">
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Settings size={32} />
            Study Preferences
          </h2>
          <p className="mt-2 opacity-90">Customize your AI study planner to fit your schedule.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
              <Briefcase size={20} className="text-purple-500" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department / Major</label>
                <input 
                  type="text" 
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                <input 
                  type="number" 
                  name="semester"
                  min="1" max="12"
                  value={formData.semester}
                  onChange={handleChange}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>
          


          <div className="pt-6">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-blue-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl transition flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Preferences & Continue'}
              {!saving && <ChevronRight size={20} />}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Preferences;
