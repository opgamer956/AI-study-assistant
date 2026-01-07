import React from 'react';
import { ViewState } from '../types';
import { BookOpen, Camera, CheckSquare, Calendar, Mic, Video, MapPin, Menu, X } from 'lucide-react';

interface Props {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Navigation: React.FC<Props> = ({ currentView, setView, isOpen, setIsOpen }) => {
  const navItems = [
    { id: ViewState.TUTOR, label: 'AI Tutor', icon: <BookOpen size={20} /> },
    { id: ViewState.SCANNER, label: 'Note Scanner', icon: <Camera size={20} /> },
    { id: ViewState.QUIZ, label: 'Quiz Generator', icon: <CheckSquare size={20} /> },
    { id: ViewState.PLANNER, label: 'Study Plan', icon: <Calendar size={20} /> },
    { id: ViewState.LIVE, label: 'Voice Tutor', icon: <Mic size={20} /> },
    { id: ViewState.VISUALS, label: 'Visual Aids', icon: <Video size={20} /> },
    { id: ViewState.SPOTS, label: 'Study Spots', icon: <MapPin size={20} /> },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-full shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex flex-col w-64 bg-white border-r border-gray-200 shadow-xl transition-transform duration-300 z-40`}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg mr-2 flex items-center justify-center">
             <span className="text-white font-bold text-lg">V</span>
          </div>
          <h1 className="text-2xl font-bold text-indigo-700 tracking-tight">Vidya AI</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id);
                setIsOpen(false); // Close on mobile after click
              }}
              className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                currentView === item.id
                  ? 'bg-indigo-50 text-indigo-700 font-medium border-l-4 border-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-500 text-center">
            Powered by Gemini
          </div>
        </div>
      </div>
    </>
  );
};

export default Navigation;
