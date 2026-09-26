import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Clock, CheckCircle, Play, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/progress/dashboard-stats');
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome back, {user?.name}</h2>
          <p className="text-gray-500 text-sm mt-1">Here is your study overview for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 font-medium bg-gray-50 px-4 py-2 rounded-lg">
            <Calendar size={16} />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Today's Study Hours */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center"
        >
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Clock size={20} /></div>
             <h3 className="text-sm font-medium text-gray-500">Today's Study Time</h3>
          </div>
          <div>
            {stats ? (
              (() => {
                let computedMinutes = 0;
                stats.todaysSessions?.forEach((s: any) => {
                  if (s.status === 'COMPLETED' && s.type !== 'BREAK') {
                    computedMinutes += (s.actualDuration !== null ? s.actualDuration : s.durationMinutes);
                  }
                });
                const h = Math.floor(computedMinutes / 60);
                const m = computedMinutes % 60;
                
                if (h === 0 && m === 0) {
                  return <p className="text-3xl font-bold text-gray-800">0<span className="text-lg text-gray-400 font-medium ml-1">min</span></p>;
                }
                return (
                  <p className="text-3xl font-bold text-gray-800 flex items-baseline gap-1">
                    {h > 0 && <>{h}<span className="text-lg text-gray-400 font-medium mr-1">hr</span></>}
                    {m > 0 && <>{m}<span className="text-lg text-gray-400 font-medium">min</span></>}
                  </p>
                );
              })()
            ) : (
              <p className="text-3xl font-bold text-gray-800">0<span className="text-lg text-gray-400 font-medium ml-1">hrs</span></p>
            )}
          </div>
        </motion.div>

        {/* Today's Tasks */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center"
        >
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle size={20} /></div>
             <h3 className="text-sm font-medium text-gray-500">Today's Tasks</h3>
          </div>
          <div className="flex gap-6">
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats?.completedTasksToday || 0}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats?.pendingTasksToday || 0}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pending</p>
            </div>
          </div>
        </motion.div>

        {/* Readiness Score */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
        >
          <div className="relative w-16 h-16 flex items-center justify-center">
             <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-100" />
                <motion.circle 
                  cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - (stats?.readinessScore || 0) / 100)}
                  className="text-blue-500"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
                {stats?.readinessScore || 0}%
              </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">AI Readiness</h3>
            <p className="text-xs text-gray-400 mt-1">Overall preparation</p>
          </div>
        </motion.div>

        {/* Next Session */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-center"
        >
          <BrainCircuit size={80} className="absolute -right-4 -bottom-4 text-white opacity-10" />
          <div className="relative z-10">
            <h3 className="text-sm font-medium text-blue-100 mb-1">Next Session</h3>
            {stats?.nextSession ? (
              <>
                <p className="text-xl font-bold truncate">{stats.nextSession.subject?.name || 'Study Time'}</p>
                <p className="text-sm text-blue-200 mt-1">{formatTime(stats.nextSession.startTime)}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold mt-1">All Caught Up!</p>
                <p className="text-sm text-blue-200 mt-1">No pending sessions</p>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* AI Recommendation Banner */}
      {stats?.aiRecommendation && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-100 to-indigo-100 border border-purple-200 p-4 rounded-xl flex items-start gap-4 shadow-sm"
        >
          <div className="bg-purple-200 p-2 rounded-full mt-1">
            <BrainCircuit size={20} className="text-purple-700" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-900 uppercase tracking-wide mb-1">AI Coach Recommendation</h3>
            <p className="text-purple-800 font-medium">{stats.aiRecommendation}</p>
          </div>
        </motion.div>
      )}



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Play size={20} className="text-blue-500" />
              Today's Schedule
            </h3>
            <Link to="/todays-plan" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View Plan <ArrowRight size={16} />
            </Link>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2">
            {stats?.todaysSessions?.length > 0 ? (
              stats.todaysSessions.map((session: any) => {
                const isBreak = session.type === 'BREAK' || !session.subjectId;
                const isCompleted = session.status === 'COMPLETED';

                return (
                  <div key={session.id} className={`flex justify-between items-center p-4 rounded-xl border ${isBreak ? 'bg-orange-50/50 border-orange-100' : isCompleted ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                      <p className={`font-semibold ${isBreak ? 'text-orange-800' : isCompleted ? 'text-green-800' : 'text-gray-800'}`}>
                        {isBreak ? 'Break' : session.subject?.name}
                      </p>
                      {!isBreak && session.topic && (
                        <p className="text-sm text-gray-500 mt-0.5">{session.topic}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isBreak ? 'text-orange-600' : isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                        {formatTime(session.startTime)}
                      </div>
                      <div className={`text-xs mt-1 font-medium ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-200 rounded-xl">
                <Calendar size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">You haven't generated a plan for today.</p>
                <Link to="/todays-plan" className="mt-4 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition font-medium text-sm">
                  Create Today's Plan
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Motivation / Progress summary */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <AlertCircle size={20} className="text-purple-500" />
            Today's Progress
          </h3>
          
          <div className="flex-1 flex flex-col justify-center items-center p-8 bg-purple-50/50 rounded-xl border border-purple-100 text-center">
            {stats?.todaysSessions?.length > 0 ? (
              <>
                <div className="w-32 h-32 relative mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-purple-100" />
                    <motion.circle 
                      cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" 
                      strokeDasharray={2 * Math.PI * 56}
                      strokeDashoffset={2 * Math.PI * 56 * (1 - (stats.completedTasksToday / (stats.completedTasksToday + stats.pendingTasksToday) || 0))}
                      className="text-purple-500"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">
                      {Math.round((stats.completedTasksToday / (stats.completedTasksToday + stats.pendingTasksToday) || 0) * 100)}%
                    </span>
                  </div>
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">
                  {stats.pendingTasksToday === 0 && stats.completedTasksToday > 0 ? 'All done for today! 🎉' : 'Keep going! 💪'}
                </h4>
                <p className="text-gray-500">
                  You have completed {stats.completedTasksToday} out of {stats.completedTasksToday + stats.pendingTasksToday} tasks today.
                </p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <BrainCircuit size={40} className="text-gray-400" />
                </div>
                <p className="text-gray-500">Start planning your day to see your progress here.</p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
