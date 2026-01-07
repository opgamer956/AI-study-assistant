import React, { useState, useEffect } from 'react';
import { generateQuiz } from '../services/geminiService';
import { QuizQuestion, UserLevel } from '../types';
import { 
    CheckSquare, ArrowRight, RefreshCw, Trophy, History, 
    Timer, ChevronLeft, ChevronRight, AlertCircle, 
    XCircle, CheckCircle, RotateCcw, Play 
} from 'lucide-react';

interface Props {
  userLevel: UserLevel;
  language: 'English' | 'Bangla';
}

interface QuizResult {
  date: string;
  topic: string;
  score: number;
  total: number;
  difficulty: string;
}

const QuizGenerator: React.FC<Props> = ({ userLevel, language }) => {
  // Setup State
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [numQuestions, setNumQuestions] = useState(5);
  
  // Quiz State
  const [view, setView] = useState<'SETUP' | 'QUIZ' | 'RESULT'>('SETUP');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<{[key: number]: string}>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  
  // History State
  const [history, setHistory] = useState<QuizResult[]>(() => {
    try {
      const saved = localStorage.getItem('vidya_quiz_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('vidya_quiz_history', JSON.stringify(history));
  }, [history]);

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (view === 'QUIZ' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && view === 'QUIZ') {
      finishQuiz();
    }
    return () => clearInterval(interval);
  }, [view, timeLeft]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setQuiz([]);
    setAnswers({});
    
    try {
      const questions = await generateQuiz(topic, userLevel, language, difficulty, numQuestions);
      setQuiz(questions);
      setView('QUIZ');
      setCurrentQuestionIndex(0);
      setTimeLeft(numQuestions * 60); // 1 minute per question
    } catch (error) {
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: option }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let score = 0;
    quiz.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) score++;
    });
    return score;
  };

  const finishQuiz = () => {
    const score = calculateScore();
    const result: QuizResult = {
        date: new Date().toLocaleDateString(),
        topic: topic,
        score: score,
        total: quiz.length,
        difficulty: difficulty
    };
    setHistory(prev => [result, ...prev].slice(0, 10)); // Keep last 10
    setView('RESULT');
  };

  const resetQuiz = () => {
    setView('SETUP');
    setQuiz([]);
    setTopic('');
    setAnswers({});
  };

  const retryQuiz = () => {
      setAnswers({});
      setCurrentQuestionIndex(0);
      setTimeLeft(quiz.length * 60);
      setView('QUIZ');
  };

  // Render Time
  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- VIEWS ---

  const renderSetup = () => (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-2xl mx-auto animate-in fade-in">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <CheckSquare className="mr-3 text-indigo-600" /> Exam Simulator
        </h2>
        
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject / Topic</label>
                <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Organic Chemistry, Calculus, English Grammar"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {(['Easy', 'Medium', 'Hard'] as const).map((level) => (
                            <button
                                key={level}
                                onClick={() => setDifficulty(level)}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                                    difficulty === level 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Questions</label>
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                        {[5, 10, 15].map((num) => (
                            <button
                                key={num}
                                onClick={() => setNumQuestions(num)}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                                    numQuestions === num
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button
                onClick={handleGenerate}
                disabled={loading || !topic}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
                {loading ? (
                    <>
                        <RefreshCw className="animate-spin mr-2" /> Creating Exam...
                    </>
                ) : 'Start Exam'}
            </button>
        </div>

        {/* Recent History Mini View */}
        {history.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Recent Results</h3>
                <div className="space-y-3">
                    {history.slice(0, 3).map((h, i) => (
                        <div key={i} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium text-gray-700 truncate max-w-[200px]">{h.topic}</div>
                            <div className={`font-bold ${h.score / h.total >= 0.8 ? 'text-green-600' : 'text-gray-600'}`}>
                                {h.score}/{h.total}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );

  const renderQuiz = () => {
    const question = quiz[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.length) * 100;
    
    return (
      <div className="max-w-3xl mx-auto h-full flex flex-col animate-in fade-in slide-in-from-right-8">
         {/* Header */}
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <span className="text-sm font-bold text-gray-500">Question {currentQuestionIndex + 1}/{quiz.length}</span>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
            <div className={`flex items-center font-mono text-lg font-bold ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
                <Timer className="mr-2" size={20}/> {formatTime(timeLeft)}
            </div>
         </div>

         {/* Question Card */}
         <div className="flex-1 bg-white p-8 rounded-2xl shadow-md border border-gray-200 flex flex-col">
             <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-8 leading-relaxed">
                {question.question}
             </h3>

             <div className="space-y-4 flex-1">
                 {question.options.map((opt, idx) => {
                     const isSelected = answers[currentQuestionIndex] === opt;
                     return (
                         <button
                            key={idx}
                            onClick={() => handleOptionSelect(opt)}
                            className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center ${
                                isSelected 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-md transform scale-[1.01]' 
                                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                            }`}
                         >
                            <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                            }`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="text-lg font-medium">{opt}</span>
                         </button>
                     );
                 })}
             </div>

             {/* Navigation */}
             <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                 <button 
                    onClick={prevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:hover:text-gray-500 px-4 py-2 font-medium"
                 >
                     <ChevronLeft className="mr-1" /> Previous
                 </button>

                 {currentQuestionIndex === quiz.length - 1 ? (
                     <button 
                        onClick={finishQuiz}
                        className="flex items-center bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg hover:shadow-xl transition-all"
                     >
                         Submit Exam <CheckCircle className="ml-2" size={18} />
                     </button>
                 ) : (
                     <button 
                        onClick={nextQuestion}
                        className="flex items-center bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all"
                     >
                         Next Question <ChevronRight className="ml-2" size={18} />
                     </button>
                 )}
             </div>
         </div>
      </div>
    );
  };

  const renderResults = () => {
    const score = calculateScore();
    const percentage = Math.round((score / quiz.length) * 100);
    
    return (
      <div className="max-w-4xl mx-auto h-full overflow-y-auto animate-in zoom-in-95 duration-300">
         {/* Score Header */}
         <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
             <div className="bg-gradient-to-r from-indigo-900 to-purple-800 p-8 text-white text-center">
                 <Trophy className="mx-auto mb-4 text-yellow-400 drop-shadow-lg" size={64} />
                 <h2 className="text-4xl font-bold mb-2">{score} / {quiz.length}</h2>
                 <p className="text-indigo-200 text-lg mb-6">
                     {percentage >= 80 ? "Outstanding Performance!" : 
                      percentage >= 60 ? "Good Job! Keep Improving." : "Keep practicing, you'll get there!"}
                 </p>
                 
                 <div className="flex justify-center gap-4">
                     <button onClick={retryQuiz} className="flex items-center px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full backdrop-blur-sm transition-colors">
                         <RotateCcw size={16} className="mr-2" /> Retry Quiz
                     </button>
                     <button onClick={resetQuiz} className="flex items-center px-6 py-2 bg-white text-indigo-900 rounded-full font-bold hover:bg-indigo-50 shadow-lg transition-colors">
                         <ArrowRight size={16} className="mr-2" /> New Topic
                     </button>
                 </div>
             </div>
         </div>

         {/* Detailed Review */}
         <div className="space-y-4 pb-8">
             <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">Detailed Review</h3>
             {quiz.map((q, idx) => {
                 const userAnswer = answers[idx];
                 const isCorrect = userAnswer === q.correctAnswer;
                 const isSkipped = !userAnswer;

                 return (
                     <div key={idx} className={`bg-white p-6 rounded-xl border-l-4 shadow-sm ${isCorrect ? 'border-green-500' : (isSkipped ? 'border-gray-400' : 'border-red-500')}`}>
                         <div className="flex items-start justify-between mb-3">
                             <h4 className="text-lg font-bold text-gray-800 max-w-[90%]">
                                 <span className="text-gray-400 mr-2">#{idx + 1}</span> {q.question}
                             </h4>
                             {isCorrect ? <CheckCircle className="text-green-500 flex-shrink-0" /> : <XCircle className="text-red-500 flex-shrink-0" />}
                         </div>

                         <div className="space-y-2 mb-4">
                             {q.options.map((opt, oIdx) => {
                                 const isSelected = userAnswer === opt;
                                 const isTheCorrectAnswer = q.correctAnswer === opt;
                                 
                                 let style = "p-3 rounded-lg text-sm border ";
                                 if (isTheCorrectAnswer) style += "bg-green-50 border-green-200 text-green-800 font-medium";
                                 else if (isSelected && !isTheCorrectAnswer) style += "bg-red-50 border-red-200 text-red-800 line-through decoration-red-400";
                                 else style += "bg-white border-gray-100 text-gray-500";

                                 return (
                                     <div key={oIdx} className={style}>
                                         {opt} {isTheCorrectAnswer && "(Correct)"} {isSelected && !isTheCorrectAnswer && "(Your Answer)"}
                                     </div>
                                 );
                             })}
                         </div>

                         <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-800 flex items-start">
                             <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                             <div>
                                 <span className="font-bold">Explanation:</span> {q.explanation}
                             </div>
                         </div>
                     </div>
                 );
             })}
         </div>
      </div>
    );
  };

  return (
    <div className="h-full p-6 overflow-y-auto bg-gray-50">
       {view === 'SETUP' && renderSetup()}
       {view === 'QUIZ' && renderQuiz()}
       {view === 'RESULT' && renderResults()}
    </div>
  );
};

export default QuizGenerator;