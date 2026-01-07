import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, Plus, Trash2, Clock, Check, Loader2, ArrowRight, 
  Mic, MicOff, Flag, AlertCircle, Save, RotateCcw, 
  Hourglass, Edit2, Link as LinkIcon, X, Filter, Sparkles, CheckCheck, WifiOff, Wifi
} from 'lucide-react';
import { generateStudyPlan } from '../services/geminiService';
import { StudyPlan, UserLevel } from '../types';

interface Props {
  userLevel: UserLevel;
  language: 'English' | 'Bangla';
}

// Helper to parse spoken dates into YYYY-MM-DD
const parseSpokenDate = (text: string): string | null => {
    const lower = text.toLowerCase().trim();
    const today = new Date();
    
    // Handle relative terms (English & simple Bangla transliteration)
    if (lower.includes('today') || lower.includes('aaj') || lower.includes('ajke')) {
        return today.toISOString().split('T')[0];
    }
    if (lower.includes('tomorrow') || lower.includes('kal') || lower.includes('kalke') || lower.includes('agamikal')) {
        const d = new Date(today);
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    }
    if (lower.includes('next week')) {
        const d = new Date(today);
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    }

    // Attempt direct parsing for standard dates (e.g., "October 15 2024")
    const d = new Date(text);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return null;
};

const StudyPlanner: React.FC<Props> = ({ userLevel, language }) => {
  // Input State - persisted to ensure countdown works after reload
  const [exams, setExams] = useState<Array<{name: string, date: string}>>(() => {
    try {
        const saved = localStorage.getItem('vidya_exams');
        return saved ? JSON.parse(saved) : [{ name: '', date: '' }];
    } catch {
        return [{ name: '', date: '' }];
    }
  });

  const [topics, setTopics] = useState('');
  const [hours, setHours] = useState(4);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Output State with Local Storage Persistence
  const [plan, setPlan] = useState<StudyPlan[]>(() => {
    try {
      const saved = localStorage.getItem('vidya_study_plan');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load plan from storage", e);
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  
  // UI State for Editing Notes
  const [editingNote, setEditingNote] = useState<{dayIdx: number, taskIdx: number} | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Voice Input State
  const [listeningField, setListeningField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Monitor Network Status
  useEffect(() => {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  // Sync plan and exams to local storage
  useEffect(() => {
    localStorage.setItem('vidya_exams', JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    if (plan.length > 0) {
      localStorage.setItem('vidya_study_plan', JSON.stringify(plan));
      setGenerated(true);
    }
  }, [plan]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = (fieldId: string, currentText: string, onUpdate: (text: string) => void) => {
    if (listeningField === fieldId) {
      recognitionRef.current?.stop();
      setListeningField(null);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'Bangla' ? 'bn-BD' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListeningField(fieldId);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const separator = currentText && !currentText.endsWith(' ') ? ' ' : '';
      onUpdate(currentText + separator + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setListeningField(null);
    };

    recognition.onend = () => setListeningField(null);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const addExam = () => setExams([...exams, { name: '', date: '' }]);
  
  const removeExam = (idx: number) => {
    if (exams.length > 1) {
      setExams(exams.filter((_, i) => i !== idx));
    } else {
      setExams([{ name: '', date: '' }]); // Reset if last one
    }
  };

  const updateExam = (idx: number, field: 'name' | 'date', value: string) => {
    const newExams = [...exams];
    newExams[idx][field] = value;
    setExams(newExams);
  };

  const handleGenerate = async () => {
    if (isOffline) {
        alert("You are offline. Please connect to the internet to generate a new AI plan.");
        return;
    }
    const validExams = exams.filter(e => e.name.trim() && e.date);
    if (validExams.length === 0) return;

    setLoading(true);
    setPlan([]);
    setGenerated(false);
    
    try {
      const generatedPlan = await generateStudyPlan(validExams, topics, hours, userLevel, language);
      setPlan(generatedPlan);
      // setGenerated is handled by useEffect when plan changes, but to be safe/instant:
      setGenerated(true); 
    } catch (e) {
      console.error(e);
      alert("Failed to generate plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearPlan = () => {
    if(confirm("Are you sure you want to delete this plan?")) {
        setPlan([]);
        setGenerated(false);
        localStorage.removeItem('vidya_study_plan');
    }
  };

  const toggleTaskCompletion = (dayIndex: number, taskIndex: number) => {
    setPlan(prevPlan => {
      const newPlan = [...prevPlan];
      const newDay = { ...newPlan[dayIndex] };
      const newTasks = [...newDay.tasks];
      const newTask = { ...newTasks[taskIndex] };
      
      newTask.completed = !newTask.completed;
      
      newTasks[taskIndex] = newTask;
      newDay.tasks = newTasks;
      newPlan[dayIndex] = newDay;
      return newPlan;
    });
  };

  // 1. Countdown Logic
  const getNextExam = () => {
      if (exams.length === 0) return null;
      const today = new Date();
      today.setHours(0,0,0,0);
      
      // Sort exams by date
      const sortedExams = [...exams]
        .filter(e => e.date && new Date(e.date) >= today)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
      if (sortedExams.length === 0) return null;
      
      const next = sortedExams[0];
      const diffTime = Math.abs(new Date(next.date).getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return { ...next, daysLeft: diffDays };
  };

  // 2. Clear Completed Tasks for a Day
  const clearCompletedForDay = (dayIdx: number) => {
      setPlan(prev => {
          const newPlan = [...prev];
          newPlan[dayIdx].tasks = newPlan[dayIdx].tasks.filter(t => !t.completed);
          return newPlan;
      });
  };

  // 3. Sort Tasks
  const sortTasks = (dayIdx: number, criterion: 'priority' | 'default') => {
      setPlan(prev => {
          const newPlan = [...prev];
          const tasks = [...newPlan[dayIdx].tasks];
          
          if (criterion === 'priority') {
              const weight = { 'High': 3, 'Medium': 2, 'Low': 1 };
              tasks.sort((a, b) => weight[b.priority] - weight[a.priority]);
          } else {
              // Simple default sort
              tasks.sort((a, b) => a.subject.localeCompare(b.subject));
          }
          
          newPlan[dayIdx].tasks = tasks;
          return newPlan;
      });
  };

  // 4. Notes Handler
  const startEditingNote = (dayIdx: number, taskIdx: number, currentNote?: string) => {
      setEditingNote({ dayIdx, taskIdx });
      setNoteContent(currentNote || '');
  };

  const saveNote = () => {
      if (!editingNote) return;
      setPlan(prev => {
          const newPlan = [...prev];
          newPlan[editingNote.dayIdx].tasks[editingNote.taskIdx].notes = noteContent;
          return newPlan;
      });
      setEditingNote(null);
      setNoteContent('');
  };

  const nextExam = getNextExam();

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Offline Banner */}
        {isOffline && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded shadow-sm">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <WifiOff className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            You are currently offline. Your study plan is saved locally and can be accessed without internet.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Input Section */}
        {!generated && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-in fade-in">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Calendar className="mr-2 text-indigo-600" /> Exam Schedule & Study Plan
          </h2>
          <p className="text-sm text-gray-500 mb-4 -mt-4">
            Input your exam dates below. Vidya will automatically prioritize topics and break down chapters into daily tasks.
          </p>

          <div className="space-y-6">
            {/* Exam Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upcoming Exams</label>
              {exams.map((exam, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 mb-3 items-start">
                  <div className="flex-1 relative w-full">
                    <input
                      type="text"
                      value={exam.name}
                      onChange={(e) => updateExam(idx, 'name', e.target.value)}
                      placeholder="Exam Name (e.g. Higher Math Paper 1)"
                      className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={() => toggleListening(`exam-${idx}`, exam.name, (val) => updateExam(idx, 'name', val))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      {listeningField === `exam-${idx}` ? <MicOff size={18} className="text-red-500 animate-pulse" /> : <Mic size={18} />}
                    </button>
                  </div>
                  <div className="w-full sm:w-48 relative">
                    <input
                      type="date"
                      value={exam.date}
                      onChange={(e) => updateExam(idx, 'date', e.target.value)}
                      className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <button onClick={() => removeExam(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <button onClick={addExam} className="flex items-center text-sm text-indigo-600 font-medium hover:text-indigo-800 mt-2">
                <Plus size={16} className="mr-1" /> Add Another Exam
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
               <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus / Chapters</label>
                  <div className="relative">
                    <textarea
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        placeholder="List specific chapters (e.g. Vector, Calculus), or weak areas..."
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                    />
                    <button 
                        onClick={() => toggleListening('topics', topics, setTopics)}
                        className="absolute right-3 top-3 p-1.5 bg-white/80 backdrop-blur-sm text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        {listeningField === 'topics' ? <MicOff size={18} className="text-red-500 animate-pulse" /> : <Mic size={18} />}
                    </button>
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Daily Study Hours</label>
                  <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <Clock className="text-gray-400" />
                    <input 
                        type="range" min="1" max="12" value={hours} 
                        onChange={(e) => setHours(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="font-bold text-gray-800 w-12 text-center">{hours}h</span>
                  </div>
               </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !exams[0].name || !exams[0].date}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg flex justify-center items-center disabled:opacity-50 transition-all"
            >
              {loading ? <><Loader2 className="animate-spin mr-2" /> Building NCTB Plan...</> : <><ArrowRight className="ml-2" /> Generate Study Schedule</>}
            </button>
          </div>
        </div>
        )}

        {/* Results Section */}
        {generated && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Dashboard Header with Countdown */}
            <div className="bg-gradient-to-r from-indigo-900 to-purple-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
                    <div className="mb-4 md:mb-0">
                        <h3 className="text-2xl font-bold mb-1 flex items-center">
                            <Sparkles className="mr-2 text-yellow-400" size={20} /> Your Study Dashboard
                        </h3>
                        <p className="text-indigo-200 text-sm">Stay consistent to achieve your goals.</p>
                    </div>
                    
                    {nextExam && (
                        <div className="w-full md:w-auto mt-2 md:mt-0 bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-lg flex items-center shadow-inner transform transition-transform hover:scale-105">
                            <div className="mr-5 text-center min-w-[80px]">
                                {nextExam.daysLeft === 0 ? (
                                    <span className="block text-xl font-bold text-red-400 animate-pulse">TODAY</span>
                                ) : (
                                    <>
                                        <span className="block text-4xl font-bold text-yellow-400 leading-none drop-shadow-sm font-mono">{nextExam.daysLeft}</span>
                                        <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Days Left</span>
                                    </>
                                )}
                            </div>
                            <div className="border-l border-white/20 pl-5">
                                <div className="text-xs uppercase opacity-70 mb-1 font-semibold tracking-wide">Upcoming Exam</div>
                                <div className="font-bold text-lg leading-tight truncate max-w-[150px]">{nextExam.name}</div>
                                <div className="text-xs opacity-60 mt-1 flex items-center">
                                    <Calendar size={10} className="mr-1" />
                                    {new Date(nextExam.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                    <button 
                        onClick={handleClearPlan}
                        className="flex items-center px-3 py-1.5 bg-white/10 hover:bg-red-500/20 rounded-lg transition-colors border border-white/10 hover:border-red-500/50"
                    >
                        <RotateCcw size={14} className="mr-2" /> Reset Plan
                    </button>
                    <div className="flex-1"></div>
                    <div className={`flex items-center px-3 py-1.5 rounded-lg border transition-colors ${
                        isOffline 
                        ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' 
                        : 'bg-green-500/20 text-green-300 border-green-500/30'
                    }`}>
                        {isOffline ? <WifiOff size={14} className="mr-2"/> : <Wifi size={14} className="mr-2"/>}
                        {isOffline ? 'Offline Mode' : 'Online'}
                    </div>
                    <div className="flex items-center px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg border border-green-500/30">
                        <Save size={14} className="mr-2"/> Saved to Device
                    </div>
                </div>
            </div>
            
            {/* Daily Plans */}
            <div className="grid gap-6">
                {plan.map((day, dayIdx) => {
                    const examMatch = exams.find(e => e.date === day.date);
                    const isExamDay = !!examMatch;
                    const totalTasks = day.tasks.length;
                    const completedCount = day.tasks.filter(t => t.completed).length;
                    const isAllDone = totalTasks > 0 && completedCount === totalTasks;
                    const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
                    
                    return (
                        <div key={dayIdx} className={`rounded-xl border transition-all duration-300 shadow-sm overflow-hidden hover:shadow-md ${
                            isExamDay 
                            ? 'bg-red-50 border-red-200 ring-2 ring-red-100' 
                            : (isAllDone ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200')
                        }`}>
                            {/* Header */}
                            <div className={`px-6 py-4 border-b ${
                                isExamDay ? 'bg-red-100 border-red-200' : (isAllDone ? 'bg-green-100 border-green-200' : 'bg-gray-50 border-gray-100')
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-2">
                                    <h4 className={`font-bold flex items-center text-lg ${isExamDay ? 'text-red-800' : (isAllDone ? 'text-green-800' : 'text-gray-700')}`}>
                                        <Calendar className={`mr-2 ${isExamDay ? 'text-red-600' : (isAllDone ? 'text-green-600' : 'text-indigo-500')}`} size={20} />
                                        {day.date}
                                    </h4>
                                    
                                    <div className="flex items-center space-x-2">
                                        {!isExamDay && (
                                            <>
                                                <button 
                                                    onClick={() => sortTasks(dayIdx, 'priority')}
                                                    className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                                                    title="Sort by Priority"
                                                >
                                                    <Filter size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => clearCompletedForDay(dayIdx)}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                                                    title="Clear Completed Tasks"
                                                >
                                                    <CheckCheck size={16} />
                                                </button>
                                            </>
                                        )}
                                        {isExamDay ? (
                                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-600 text-white flex items-center animate-pulse shadow-sm">
                                                <Flag size={12} className="mr-1" fill="currentColor"/> EXAM DAY
                                            </span>
                                        ) : (
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${isAllDone ? 'bg-white text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                                                {progressPercentage}% Done
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {!isExamDay && totalTasks > 0 && (
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mt-1">
                                        <div 
                                            className={`h-full transition-all duration-700 ease-out rounded-full ${isAllDone ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                            style={{ width: `${progressPercentage}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Exam Banner */}
                            {isExamDay && (
                                <div className="bg-red-500 text-white px-6 py-4 flex items-center justify-center font-bold text-lg shadow-inner">
                                    <AlertCircle size={24} className="mr-3" />
                                    Big Day: {examMatch?.name}
                                </div>
                            )}

                            {/* Tasks */}
                            <div className="p-6 space-y-3">
                                {day.tasks.length === 0 && !isExamDay && (
                                    <div className="text-center py-4 text-gray-400 italic text-sm">
                                        No tasks remaining for this day. Well done!
                                    </div>
                                )}
                                {day.tasks.map((task, tIdx) => (
                                    <div 
                                        key={tIdx} 
                                        className={`group relative flex flex-col p-3 rounded-lg border transition-all duration-300 ${
                                            task.completed 
                                            ? 'bg-gray-50 border-gray-100 opacity-60 scale-[0.99]' 
                                            : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-start cursor-pointer" onClick={() => toggleTaskCompletion(dayIdx, tIdx)}>
                                            <div className={`mt-0.5 mr-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                                task.completed 
                                                ? 'bg-green-500 border-green-500' 
                                                : 'border-gray-300 group-hover:border-indigo-400 bg-white'
                                            }`}>
                                                {task.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {!task.completed && (
                                                            <div className={`w-2 h-2 rounded-full ${
                                                                task.priority === 'High' ? 'bg-red-500' :
                                                                task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                                            }`} />
                                                        )}
                                                        <h5 className={`font-semibold text-sm transition-all ${task.completed ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-800'}`}>
                                                            {task.subject}
                                                        </h5>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                                                            task.completed ? 'bg-gray-100 text-gray-400' : 
                                                            (task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700')
                                                        }`}>
                                                            {task.priority}
                                                        </span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startEditingNote(dayIdx, tIdx, task.notes);
                                                            }}
                                                            className={`p-1 rounded hover:bg-gray-100 transition-colors ${task.notes ? 'text-indigo-600' : 'text-gray-300 group-hover:text-gray-400'}`}
                                                        >
                                                            {task.notes ? <LinkIcon size={14} /> : <Edit2 size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className={`text-sm mt-1 transition-colors ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {task.topic}
                                                </p>
                                                <div className={`flex items-center mt-2 text-xs ${task.completed ? 'text-gray-300' : 'text-gray-400'}`}>
                                                    <Clock size={12} className="mr-1" /> {task.duration}
                                                </div>
                                                
                                                {/* Display Note Snippet */}
                                                {task.notes && !task.completed && (
                                                    <div className="mt-2 text-xs bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100 flex items-start">
                                                        <div className="mr-1 mt-0.5">📝</div>
                                                        <div className="line-clamp-2">{task.notes}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Inline Note Editor */}
                                        {editingNote?.dayIdx === dayIdx && editingNote?.taskIdx === tIdx && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top-1">
                                                <textarea
                                                    value={noteContent}
                                                    onChange={(e) => setNoteContent(e.target.value)}
                                                    placeholder="Add a note or resource link..."
                                                    className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none min-h-[60px]"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end space-x-2 mt-2">
                                                    <button 
                                                        onClick={() => setEditingNote(null)}
                                                        className="px-3 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={saveNote}
                                                        className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                                                    >
                                                        Save Note
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
};

export default StudyPlanner;