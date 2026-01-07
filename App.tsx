import React, { useState } from 'react';
import Navigation from './components/Navigation';
import ChatInterface from './components/ChatInterface';
import NoteScanner from './components/NoteScanner';
import QuizGenerator from './components/QuizGenerator';
import VisualAids from './components/VisualAids';
import LiveTutor from './components/LiveTutor';
import StudySpots from './components/StudySpots';
import StudyPlanner from './components/StudyPlanner';
import { ViewState, UserLevel } from './types';
import { Globe, GraduationCap } from 'lucide-react';

export const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.TUTOR);
  const [navOpen, setNavOpen] = useState(false);
  
  // Global Settings - Default to Class 10 (SSC)
  const [userLevel, setUserLevel] = useState<UserLevel>(UserLevel.CLASS_10);
  const [language, setLanguage] = useState<'English' | 'Bangla'>('English');

  // Study Context (Knowledge Base from Scanned Docs)
  const [studyContext, setStudyContext] = useState<string>("");

  const renderContent = () => {
    switch (view) {
      case ViewState.TUTOR:
        return <ChatInterface userLevel={userLevel} language={language} studyContext={studyContext} />;
      case ViewState.SCANNER:
        return <NoteScanner onContextUpdate={setStudyContext} currentContext={studyContext} />;
      case ViewState.QUIZ:
        return <QuizGenerator userLevel={userLevel} language={language} />;
      case ViewState.VISUALS:
        return <VisualAids />;
      case ViewState.LIVE:
        return <LiveTutor userLevel={userLevel} language={language} />;
      case ViewState.SPOTS:
        return <StudySpots />;
      case ViewState.PLANNER:
        return <StudyPlanner userLevel={userLevel} language={language} />;
      default:
        return (
            <div className="p-10 text-center">
                <h1 className="text-2xl font-bold text-gray-400">Coming Soon</h1>
                <p className="text-gray-500">The study planner is under construction.</p>
            </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 font-sans">
      <Navigation 
        currentView={view} 
        setView={setView} 
        isOpen={navOpen} 
        setIsOpen={setNavOpen}
      />
      
      <main className="flex-1 flex flex-col h-full relative w-full">
        {/* Top Bar for Settings */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-6 md:px-8">
            <div className="md:hidden w-8"></div> {/* Spacer for menu button */}
            <h1 className="text-lg font-bold text-gray-800 hidden md:block">
                {view === ViewState.TUTOR && "AI Tutor"}
                {view === ViewState.SCANNER && "Smart Scanner"}
                {view === ViewState.QUIZ && "Quiz Mode"}
                {view === ViewState.LIVE && "Live Session"}
                {view === ViewState.VISUALS && "Visual Aids"}
                {view === ViewState.SPOTS && "Nearby Spots"}
                {view === ViewState.PLANNER && "Smart Planner"}
            </h1>

            <div className="flex items-center space-x-3">
                {/* Level Selector */}
                <div className="hidden sm:flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                    <GraduationCap size={16} className="text-gray-500 mr-2"/>
                    <select 
                        value={userLevel} 
                        onChange={(e) => setUserLevel(e.target.value as UserLevel)}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer max-w-[150px] truncate"
                    >
                        {Object.values(UserLevel).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>

                {/* Language Toggle */}
                <button 
                    onClick={() => setLanguage(language === 'English' ? 'Bangla' : 'English')}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                    <Globe size={16} />
                    <span className="text-sm font-medium">{language}</span>
                </button>
            </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};