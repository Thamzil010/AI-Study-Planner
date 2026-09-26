import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, BookOpen, CheckCircle, ChevronDown, ChevronUp, Video, FileText, Link2, Brain } from 'lucide-react';
import { api } from '../services/api';

const History = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/schedules');
        
        // Filter out future dates (keep only up to today)
        const now = new Date();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const pastAndTodaySchedules = res.data.filter((s: any) => new Date(s.date).getTime() <= todayEnd.getTime());

        // Deduplicate by date (keep the one with most sessions if duplicates exist)
        const uniqueSchedulesMap = new Map();
        pastAndTodaySchedules.forEach((s: any) => {
           const dateKey = s.date.split('T')[0];
           if (!uniqueSchedulesMap.has(dateKey)) {
               uniqueSchedulesMap.set(dateKey, s);
           } else {
               const existing = uniqueSchedulesMap.get(dateKey);
               if (s.sessions.length > existing.sessions.length) {
                   uniqueSchedulesMap.set(dateKey, s);
               }
           }
        });
        const uniqueSchedules = Array.from(uniqueSchedulesMap.values());

        // Sort by date descending (newest first)
        const sorted = uniqueSchedules.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSchedules(sorted);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-16 bg-gray-200 rounded-2xl w-full"></div>
        {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">History</h2>
        <p className="text-gray-500 text-sm mt-1">Review your past study plans and accomplishments.</p>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
          <CalendarIcon size={64} className="text-gray-200 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-800">No History Yet</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">You haven't generated any study plans. Go to Today's Plan to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const isExpanded = expandedId === schedule.id;
            const totalTasks = schedule.sessions.length;
            const completedTasks = schedule.sessions.filter((s: any) => s.status === 'COMPLETED').length;
            const dateStr = new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
            const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return (
              <div key={schedule.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button 
                  onClick={() => toggleExpand(schedule.id)}
                  className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${completionPercentage >= 100 ? 'bg-green-500' : completionPercentage > 0 ? 'bg-blue-500' : 'bg-gray-400'}`}>
                      <CalendarIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{dateStr}</h3>
                      <p className="text-sm text-gray-500 font-medium">
                        {completedTasks} / {totalTasks} Sessions Completed
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="hidden sm:block text-right">
                      <div className="text-2xl font-bold text-gray-800">{completionPercentage}%</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completion</div>
                    </div>
                    {isExpanded ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100 bg-gray-50"
                    >
                      <div className="p-6 space-y-3">
                        {schedule.sessions.length === 0 ? (
                          <div className="text-center text-gray-500 py-4">No sessions scheduled for this day.</div>
                        ) : (
                          schedule.sessions.map((session: any) => {
                            const isBreak = session.type === 'BREAK' || !session.subjectId;
                            const isCompleted = session.status === 'COMPLETED';

                            return (
                              <div key={session.id} className={`flex flex-col p-4 rounded-xl border ${isBreak ? 'bg-orange-50/50 border-orange-100' : isCompleted ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'}`}>
                                <div className="flex flex-col sm:flex-row justify-between">
                                  <div className="flex items-start gap-4">
                                    <div className="pt-0.5">
                                      <Clock size={18} className={isBreak ? 'text-orange-400' : isCompleted ? 'text-green-500' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-bold ${isBreak ? 'text-orange-700' : isCompleted ? 'text-green-800' : 'text-gray-800'}`}>
                                          {isBreak ? 'Break Time' : session.subject?.name}
                                        </span>
                                        {!isBreak && session.isHomework && (
                                          <span className="text-xs uppercase font-bold px-2 py-0.5 rounded text-purple-700 bg-purple-100 border border-purple-200">HW</span>
                                        )}
                                      </div>
                                      {!isBreak && session.topic && (
                                        <div className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                                          <BookOpen size={14} className="text-gray-400" />
                                          {session.topic}
                                        </div>
                                      )}
                                      <div className="text-sm text-gray-500 mt-2 font-medium">
                                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-3 sm:mt-0 flex items-center justify-end">
                                    <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${isCompleted ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                      {isCompleted ? <><CheckCircle size={14} /> Completed</> : 'Pending'}
                                    </span>
                                  </div>
                                </div>
                                
                                {!isBreak && session.subject?.resources && session.subject.resources.length > 0 && (
                                  <div className="mt-3 sm:ml-10 border-t border-gray-100 pt-3">
                                    <div className="flex flex-wrap gap-2">
                                      {session.subject.resources.map((r: any) => {
                                        let Icon = Link2;
                                        if (r.type === 'VIDEO') Icon = Video;
                                        else if (r.type === 'ARTICLE') Icon = FileText;
                                        else if (r.type === 'DOCUMENT') Icon = BookOpen;
                                        else if (r.type === 'PRACTICE') Icon = Brain;
                                        
                                        return (
                                          <a 
                                            key={r.id} 
                                            href={r.url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-xs bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 px-2 py-1 rounded transition font-medium truncate max-w-[200px] shadow-sm flex items-center gap-1"
                                            title={r.title}
                                          >
                                            <Icon size={12} className="flex-shrink-0" />
                                            {r.title}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
