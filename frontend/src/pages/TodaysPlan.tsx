import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, Sparkles, Coffee, Plus, Trash2, CheckCircle, Brain, XCircle, ArrowRight, BookOpen, Video, FileText, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const TodaysPlan = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'PLAN' | 'VIEW'>('VIEW');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [scheduleData, setScheduleData] = useState<any>(null);
  
  const getLocalDateString = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [viewDate, setViewDate] = useState(() => getLocalDateString());

  // Section 1: Today's Availability
  const [planDate, setPlanDate] = useState(() => getLocalDateString());
  const [studyStartTime, setStudyStartTime] = useState(() => localStorage.getItem('studyStartTime') || '');
  const [studyEndTime, setStudyEndTime] = useState(() => localStorage.getItem('studyEndTime') || '');
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [hasWorkingHours, setHasWorkingHours] = useState(false);
  const [workStartTime, setWorkStartTime] = useState('');
  const [workEndTime, setWorkEndTime] = useState('');

  // Timer State
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem('timer_activeSessionId'));
  const [isTimerRunning, setIsTimerRunning] = useState(() => localStorage.getItem('timer_isTimerRunning') === 'true');
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(() => {
    const ts = localStorage.getItem('timer_timerStartTimestamp');
    return ts ? parseInt(ts, 10) : null;
  });
  const [timerAccumulated, setTimerAccumulated] = useState(() => {
    const acc = localStorage.getItem('timer_timerAccumulated');
    return acc ? parseInt(acc, 10) : 0;
  });
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const running = localStorage.getItem('timer_isTimerRunning') === 'true';
    const accStr = localStorage.getItem('timer_timerAccumulated');
    const acc = accStr ? parseInt(accStr, 10) : 0;
    const tsStr = localStorage.getItem('timer_timerStartTimestamp');
    const ts = tsStr ? parseInt(tsStr, 10) : null;
    
    if (running && ts) {
      return acc + Math.floor((Date.now() - ts) / 1000);
    }
    return acc;
  });

  // Sync timer state to localStorage
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('timer_activeSessionId', activeSessionId);
    } else {
      localStorage.removeItem('timer_activeSessionId');
    }
    localStorage.setItem('timer_isTimerRunning', String(isTimerRunning));
    if (timerStartTimestamp) {
      localStorage.setItem('timer_timerStartTimestamp', String(timerStartTimestamp));
    } else {
      localStorage.removeItem('timer_timerStartTimestamp');
    }
    localStorage.setItem('timer_timerAccumulated', String(timerAccumulated));
  }, [activeSessionId, isTimerRunning, timerStartTimestamp, timerAccumulated]);

  // Resources State
  const [sessionResources, setSessionResources] = useState<Record<string, any[]>>({});
  const [loadingResourcesFor, setLoadingResourcesFor] = useState<string | null>(null);

  // Timer functions
  const startSessionTimer = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsTimerRunning(true);
    setTimerStartTimestamp(Date.now());
    setTimerAccumulated(0);
    setTimerSeconds(0);
  };

  const clearSessionTimer = () => {
    setActiveSessionId(null);
    setIsTimerRunning(false);
    setTimerStartTimestamp(null);
    setTimerAccumulated(0);
    setTimerSeconds(0);
  };

  const toggleTimer = () => {
    if (isTimerRunning) {
      setIsTimerRunning(false);
      setTimerAccumulated(timerSeconds);
      setTimerStartTimestamp(null);
    } else {
      setIsTimerRunning(true);
      setTimerStartTimestamp(Date.now());
    }
  };

  const fetchScheduleForDate = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/schedules?date=${date}`);
      if (res.data && res.data.length > 0) {
        setScheduleData(res.data[0]);
      } else {
        setScheduleData(null);
      }
    } catch (error) {
      console.error('Failed to fetch schedule', error);
      toast.error('Failed to load schedule for this date');
    } finally {
      setLoading(false);
    }
  }, []);

  

  // Timer tick effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timerStartTimestamp) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - timerStartTimestamp) / 1000);
        setTimerSeconds(timerAccumulated + elapsed);
      }, 1000);
    } else {
      setTimerSeconds(timerAccumulated);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartTimestamp, timerAccumulated]);

  // Auto-complete session when timer reaches its duration
  useEffect(() => {
    if (activeSessionId && scheduleData && isTimerRunning) {
      const activeSession = scheduleData.sessions.find((s: any) => s.id === activeSessionId);
      if (activeSession) {
        const maxSeconds = activeSession.durationMinutes * 60;
        if (timerSeconds >= maxSeconds) {
          clearSessionTimer();
          handleCompleteSession(activeSession.id, activeSession.subjectId, maxSeconds);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds, activeSessionId, scheduleData, isTimerRunning]);

  useEffect(() => {
    if (viewMode === 'VIEW') {
      // eslint-disable-next-line react/set-state-in-effect
      fetchScheduleForDate(viewDate);
    }
  }, [viewMode, viewDate, fetchScheduleForDate]);


  // Auto-fetch resources for active session if missing
  useEffect(() => {
    if (activeSessionId && scheduleData) {
      const activeSession = scheduleData.sessions.find((s: any) => s.id === activeSessionId);
      if (activeSession && activeSession.subjectId && !sessionResources[activeSession.id] && loadingResourcesFor !== activeSession.id) {
        setLoadingResourcesFor(activeSession.id);
        api.get(`/resources/topic/${activeSession.subjectId}`)
          .then(res => {
            setSessionResources(prev => ({ ...prev, [activeSession.id]: res.data }));
          })
          .catch(err => console.error('Failed to load resources', err))
          .finally(() => setLoadingResourcesFor(null));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, scheduleData]);

  const handleGenerate = async () => {
    if (!studyStartTime || !studyEndTime) {
      toast.error('Please fill in your Study Start/End times');
      return;
    }
    
    if (hasWorkingHours && (!workStartTime || !workEndTime)) {
      toast.error('Please fill in your Work Start/End times');
      return;
    }

    setGenerating(true);
    try {
      const subjectsRes = await api.get('/subjects');
      const fetchedSubjects = subjectsRes.data;

      if (!fetchedSubjects || fetchedSubjects.length === 0) {
        toast.error('Please add at least one subject in the Subjects tab first');
        setGenerating(false);
        return;
      }

      const mappedTasks = fetchedSubjects.map((subject: any) => ({
        id: subject.id,
        subjectName: subject.name,
        topic: subject.topic || '',
        homework: '',
        estimatedHours: subject.estimatedStudyHours || 1,
        priority: subject.priority || 5,
        difficulty: subject.difficulty || 'MEDIUM'
      }));

      const start = new Date(`2000-01-01T${studyStartTime}`);
      const end = new Date(`2000-01-01T${studyEndTime}`);
      let diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diffHours < 0) diffHours += 24;
      const computedTotalStudyHours = Math.round(diffHours * 10) / 10;

      const payload = {
        date: planDate,
        studyStartTime,
        studyEndTime,
        workingHours: hasWorkingHours ? { start: workStartTime, end: workEndTime } : null,
        totalStudyHours: computedTotalStudyHours,
        tasks: mappedTasks
      };
      
      const res = await api.post('/schedules/generate', payload);
      
      if (res.data.fallbackUsed) {
        toast('AI scheduling is unavailable. The fallback scheduler was used.', { icon: '⚠️' });
      } else {
        toast.success("Today's Plan generated successfully!");
      }
      
      setViewDate(planDate);
      setViewMode('VIEW');
      
      // Reset form for next planning
      setHasWorkingHours(false);
      setWorkStartTime('');
      setWorkEndTime('');
    } catch (error) {
      console.error('Failed to generate schedule', error);
      toast.error('Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteSession = async (sessionId: string, subjectId: string | null, durationSeconds: number = 0) => {
    try {
      const durationMinutes = Math.round(durationSeconds / 60);
      const loadingToast = toast.loading('Completing session & generating quiz (this may take a few seconds)...');
      const apiRes = await api.post(`/schedules/sessions/${sessionId}/complete`, { actualDuration: durationMinutes });
      toast.dismiss(loadingToast);
      
      const res = await api.get(`/schedules?date=${viewDate}`);
      if (res.data && res.data.length > 0) {
        const updatedSchedule = res.data[0];
        setScheduleData(updatedSchedule);
        
        const nextPendingIndex = updatedSchedule.sessions.findIndex((s: any) => s.status === 'PENDING');
        if (activeSessionId === sessionId) {
          clearSessionTimer();
        }
        if (nextPendingIndex === -1) {
           toast.success("All today's tasks completed! 🎉", { icon: '🏆', duration: 4000 });
        }
      }

      if (apiRes.data.generatedQuiz) {
        navigate('/quizzes', { state: { startQuizId: apiRes.data.generatedQuiz.id } });
      }
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Failed to mark session as complete');
    }
  };


  const handleStartNextSession = async () => {
    // Wait for the fresh schedule to be available
    const freshSchedule = scheduleData; 
    if (!freshSchedule) return;

    const nextSession = freshSchedule.sessions.find((s: any) => s.status === 'PENDING' && s.type !== 'BREAK');
    

    
    if (nextSession) {
      startSessionTimer(nextSession.id);
      
      if (nextSession.subjectId && !sessionResources[nextSession.id]) {
        setLoadingResourcesFor(nextSession.id);
        try {
          const res = await api.get(`/resources/topic/${nextSession.subjectId}`);
          setSessionResources(prev => ({ ...prev, [nextSession.id]: res.data }));
        } catch (err) {
          console.error(err);
          toast.error('Failed to load resources');
        } finally {
          setLoadingResourcesFor(null);
        }
      }
      
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
      
      toast.success(`Started next session: ${nextSession.subject?.name}`);
    } else {
      toast.success("All today's tasks completed! 🎉", { icon: '🏆', duration: 4000 });
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 300);
    }
  };

  if (loading && viewMode === 'VIEW') return <div className="flex h-screen items-center justify-center">Loading plan...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Today's Plan</h2>
          <p className="text-gray-500 text-sm mt-1">Organize your tasks and crush your goals.</p>
        </div>
        <div className="flex gap-3">
          {viewMode === 'VIEW' ? (
            <>
              <input 
                type="date" 
                value={viewDate} 
                onChange={e => setViewDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <button 
                onClick={() => setViewMode('PLAN')}
                className="bg-blue-600 text-white px-5 py-2 rounded-xl hover:bg-blue-700 shadow-md transition font-medium"
              >
                Plan a Day
              </button>
            </>
          ) : (
            <button 
              onClick={() => { setViewMode('VIEW'); fetchScheduleForDate(viewDate); }}
              className="bg-gray-100 text-gray-600 px-5 py-2 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              Back to Today's Plan
            </button>
          )}
        </div>
      </div>

      {viewMode === 'PLAN' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* SECTION 1 */}
          {/* SECTION 1 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg text-gray-800">Section 1 – Today's Availability</h3>
              <button 
                onClick={() => {
                  if (isEditingTime) {
                    localStorage.setItem('studyStartTime', studyStartTime);
                    localStorage.setItem('studyEndTime', studyEndTime);
                  }
                  setIsEditingTime(!isEditingTime);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                {isEditingTime ? <CheckCircle size={16} /> : <Clock size={16} />}
                {isEditingTime ? 'Save Time' : 'Edit Time'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Study Start Time</label>
                {isEditingTime ? (
                  <input type="time" value={studyStartTime} onChange={e => setStudyStartTime(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50" />
                ) : (
                  <div className="w-full border border-transparent rounded-lg p-2 bg-gray-50 text-gray-700">
                    {studyStartTime || '--:--'}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Study End Time</label>
                {isEditingTime ? (
                  <input type="time" value={studyEndTime} onChange={e => setStudyEndTime(e.target.value)} className="w-full border rounded-lg p-2 bg-gray-50" />
                ) : (
                  <div className="w-full border border-transparent rounded-lg p-2 bg-gray-50 text-gray-700">
                    {studyEndTime || '--:--'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button 
              onClick={handleGenerate}
              disabled={generating}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-700 shadow-lg transition flex items-center gap-2 font-bold disabled:opacity-50 text-lg"
            >
              {generating ? <Sparkles size={20} className="animate-spin" /> : <Sparkles size={20} />}
              {generating ? "Generating Plan..." : "Generate Today's Plan"}
            </button>
          </div>
        </motion.div>
      )}

      {viewMode === 'VIEW' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* SECTION 3 */}
          {!scheduleData ? (
            <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
              <CalendarIcon size={64} className="text-blue-200 mb-6" />
              <h3 className="text-2xl font-bold text-gray-800">No plan for {viewDate}</h3>
              <p className="mt-2 text-gray-500 max-w-md mx-auto">You haven't planned anything for this day yet.</p>
              <button 
                onClick={() => { setPlanDate(viewDate); setViewMode('PLAN'); }}
                className="mt-8 bg-blue-50 text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-100 transition flex items-center gap-2 font-medium"
              >
                Plan this Day
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between text-white border-b border-blue-700">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <CalendarIcon size={24} /> Section 3 – Generated Timetable
                </h3>
                <span className="font-medium bg-blue-700/50 px-3 py-1 rounded-lg">
                  {new Date(scheduleData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })}
                </span>
              </div>
              
              <div className="p-6">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {scheduleData.sessions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Coffee size={32} className="mx-auto mb-2 opacity-50" />
                      <p>Rest day</p>
                    </div>
                  ) : (
                    scheduleData.sessions.map((session: any) => {
                      const isBreak = session.type === 'BREAK' || !session.subjectId;
                      const isCompleted = session.status === 'COMPLETED';
                      
                      return (
                        <div 
                          key={session.id} 
                          className={`flex flex-col md:flex-row p-5 rounded-2xl border ${isBreak ? 'bg-orange-50 border-orange-100' : isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow'}`}
                        >
                          <div className="w-full md:w-36 flex-shrink-0 flex items-center md:items-start gap-2 text-gray-500 mb-3 md:mb-0 pt-1">
                            <Clock size={18} className={isBreak ? 'text-orange-400' : 'text-blue-500'} />
                            <div className="font-medium text-lg">
                              {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <div className="text-sm text-gray-400 hidden md:block mt-0.5">
                                to {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`font-bold text-xl flex items-center gap-2 ${isBreak ? 'text-orange-700' : isCompleted ? 'text-green-800' : 'text-gray-800'}`}>
                                  {isBreak ? 'Break Time' : session.subject?.name}
                                  {!isBreak && session.isHomework && (
                                    <span className="text-xs uppercase font-bold px-2 py-1 rounded-md bg-purple-100 text-purple-700 border border-purple-200 ml-2">Homework</span>
                                  )}
                                </span>
                                {!isBreak && session.topic && (
                                  <div className="text-gray-600 mt-1.5 font-medium flex items-center gap-1.5">
                                    <BookOpen size={16} className="text-gray-400" />
                                    {session.topic}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${isCompleted ? 'bg-green-100 text-green-700' : isBreak ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                  Status: {isCompleted ? 'Completed' : 'Pending'}
                                </span>
                                
                                {!isCompleted && (
                                  <div className="flex items-center gap-2">
                                    {activeSessionId === session.id ? (
                                      <>
                                        <div className="font-mono text-lg font-bold mr-2">
                                          {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
                                        </div>
                                        <button 
                                          onClick={() => toggleTimer()}
                                          className={`${isTimerRunning ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'} border px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1 shadow-sm`}
                                        >
                                          {isTimerRunning ? 'Pause' : 'Resume'}
                                        </button>
                                        <button 
                                          onClick={() => handleCompleteSession(session.id, session.subjectId, timerSeconds)}
                                          className="bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-1 shadow-sm"
                                        >
                                          <CheckCircle size={16} /> Complete
                                        </button>
                                      </>
                                    ) : (
                                      <button 
                                        onClick={async () => {
                                          startSessionTimer(session.id);
                                          
                                          if (session.subjectId && !sessionResources[session.id]) {
                                            setLoadingResourcesFor(session.id);
                                            try {
                                              const res = await api.get(`/resources/topic/${session.subjectId}`);
                                              setSessionResources(prev => ({ ...prev, [session.id]: res.data }));
                                            } catch (err) {
                                              console.error(err);
                                              toast.error('Failed to load resources');
                                            } finally {
                                              setLoadingResourcesFor(null);
                                            }
                                          }
                                        }}
                                        className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-sm"
                                      >
                                        Start {isBreak ? 'Break' : 'Session'}
                                      </button>
                                    )}
                                  </div>
                                )}

                              </div>
                            </div>
                            
                            {loadingResourcesFor === session.id && (
                              <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col items-center justify-center text-blue-500">
                                <Sparkles size={24} className="animate-spin mb-2" />
                                <p className="text-sm font-medium">AI is gathering the best resources...</p>
                              </div>
                            )}

                            {!isBreak && sessionResources[session.id] && sessionResources[session.id].length > 0 && (
                              <div className="mt-4 border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">AI Recommended Resources</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {['YOUTUBE', 'ARTICLE', 'PDF', 'PRACTICE'].map(type => {
                                    const typeResources = sessionResources[session.id].filter(r => r.type === type);
                                    if (typeResources.length === 0) return null;
                                    
                                    let Icon = Link2;
                                    let typeName = 'Resources';
                                    if (type === 'YOUTUBE') { Icon = Video; typeName = 'YouTube Videos'; }
                                    else if (type === 'ARTICLE') { Icon = FileText; typeName = 'Articles'; }
                                    else if (type === 'PDF') { Icon = BookOpen; typeName = 'PDF Notes'; }
                                    else if (type === 'PRACTICE') { Icon = Brain; typeName = 'Practice'; }
                                    
                                    return (
                                      <div key={type} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase mb-2">
                                          <Icon size={14} /> {typeName}
                                        </div>
                                        <div className="space-y-2">
                                          {typeResources.map((r: any, idx: number) => (
                                            <a 
                                              key={idx} 
                                              href={r.url} 
                                              target="_blank" 
                                              rel="noreferrer"
                                              className="block text-sm bg-white text-blue-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 p-2 rounded-lg transition font-medium truncate shadow-sm"
                                              title={r.title}
                                            >
                                              {r.title}
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}


        </motion.div>
      )}
    </div>
  );
};

export default TodaysPlan;
