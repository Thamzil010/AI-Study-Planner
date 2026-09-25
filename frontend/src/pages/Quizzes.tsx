import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Brain, CheckCircle, ArrowRight, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const Quizzes = () => {
  const location = useLocation();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchQuizzes();
    if (location.state && location.state.startQuizId) {
      startQuiz(location.state.startQuizId);
      // clear the state so it doesn't restart on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get('/quizzes');
      setQuizzes(res.data);
    } catch (error) {
      console.error('Failed to fetch quizzes', error);
    } finally {
      setLoading(false);
    }
  };

  const viewQuizResult = async (quizId: string) => {
    try {
      const res = await api.get(`/quizzes/${quizId}`);
      const quiz = res.data;
      
      let correctCount = 0;
      const initialAnswers: Record<string, string> = {};
      
      quiz.questions.forEach((q: any) => {
        if (q.userAnswer) {
           initialAnswers[q.id] = q.userAnswer;
           if (q.userAnswer === q.correctAnswer) correctCount++;
        }
      });
      
      setActiveQuiz(quiz);
      setAnswers(initialAnswers);
      setResult({
        score: quiz.score,
        correctCount,
        feedback: quiz.feedback,
        weakAreas: quiz.weakAreas,
        strongAreas: quiz.strongAreas,
        suggestions: quiz.suggestions
      });
    } catch (error) {
      toast.error('Failed to load quiz results');
    }
  };

  const startQuiz = async (quizId: string) => {
    try {
      const res = await api.get(`/quizzes/${quizId}`);
      setActiveQuiz(res.data);
      setAnswers({});
      setResult(null);
    } catch (error) {
      toast.error('Failed to load quiz');
    }
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < activeQuiz.questions.length) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/quizzes/${activeQuiz.id}/submit`, { answers });
      setResult(res.data);
      fetchQuizzes(); // Refresh list to update scores
    } catch (error) {
      toast.error('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-16 bg-gray-200 rounded-2xl w-full"></div>
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>)}
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Quiz Completed!</h2>
          <p className="text-gray-500 mt-2 text-lg">Topic: {activeQuiz.topic}</p>
          
          <div className="mt-8 flex justify-center gap-12">
            <div className="text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Score</p>
              <p className="text-5xl font-black text-blue-600 mt-2">{Math.round(result.score || 0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Correct</p>
              <p className="text-5xl font-black text-green-600 mt-2">{result.correctCount}/{activeQuiz.questions.length}</p>
            </div>
          </div>
          
          <div className="mt-8 bg-blue-50 p-6 rounded-xl text-left border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-blue-600" size={20} />
              <h3 className="font-bold text-blue-800">AI Feedback</h3>
            </div>
            <p className="text-blue-900 leading-relaxed">{result.feedback || "Great effort! Keep practicing."}</p>
          </div>

          <div className="mt-8 space-y-4 text-left">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Detailed Results</h3>
            {activeQuiz.questions.map((q: any, idx: number) => {
              const isCorrect = answers[q.id] === q.correctAnswer;
              return (
                <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="font-medium text-gray-800">{idx + 1}. {q.question}</p>
                  <p className={`mt-2 text-sm font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    Your Answer: {answers[q.id] || "Skipped"}
                  </p>
                  {!isCorrect && (
                    <p className="mt-1 text-sm text-green-700 font-medium">
                      Correct Answer: {q.correctAnswer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          
          <button 
            onClick={() => { setActiveQuiz(null); setResult(null); }}
            className="mt-8 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 font-medium transition w-full"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (activeQuiz) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center sticky top-4 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Quiz: {activeQuiz.topic}</h2>
            <p className="text-sm text-gray-500">{activeQuiz.questions.length} Questions</p>
          </div>
          <button onClick={() => setActiveQuiz(null)} className="text-gray-400 hover:text-gray-600 font-medium">Cancel</button>
        </div>
        
        <div className="space-y-6">
          {activeQuiz.questions.map((q: any, idx: number) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">{idx + 1}. {q.question}</h3>
              <div className="space-y-3">
                {q.options.map((opt: string, i: number) => (
                  <label key={i} className={`block p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${answers[q.id] === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}
                  `}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name={`question-${q.id}`} 
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleSelectAnswer(q.id, opt)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className={`font-medium ${answers[q.id] === opt ? 'text-blue-700' : 'text-gray-700'}`}>{opt}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-70 shadow-md flex items-center gap-2"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'} <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Quizzes</h2>
          <p className="text-gray-500 text-sm mt-1">Take quizzes generated automatically from your completed study sessions.</p>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
          <Brain size={64} className="text-gray-200 mb-6" />
          <h3 className="text-2xl font-bold text-gray-800">No Quizzes Yet</h3>
          <p className="mt-2 text-gray-500 max-w-md text-center">Quizzes are automatically generated when you complete a study session in Today's Plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz, index) => (
            <motion.div 
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative flex flex-col h-full"
            >
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <BookOpen size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    {quiz.totalQuestions} Questions
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2" title={quiz.topic}>{quiz.topic}</h3>
                <p className="text-sm text-gray-500">
                  Generated on {new Date(quiz.createdAt).toLocaleDateString()}
                </p>
                {quiz.score !== null && (
                  <div className="mt-4 bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                    <span className="text-green-800 font-medium text-sm">Previous Score</span>
                    <span className="text-green-700 font-bold">{Math.round(quiz.score)}%</span>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-50 bg-gray-50">
                {quiz.score !== null ? (
                  <button 
                    onClick={() => viewQuizResult(quiz.id)}
                    className="w-full bg-blue-50 text-blue-700 border border-blue-200 py-2.5 rounded-xl font-medium hover:bg-blue-100 transition"
                  >
                    View Results
                  </button>
                ) : (
                  <button 
                    onClick={() => startQuiz(quiz.id)}
                    className="w-full bg-white text-blue-600 border border-blue-200 py-2.5 rounded-xl font-medium hover:bg-blue-50 transition"
                  >
                    Start Quiz
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Quizzes;
