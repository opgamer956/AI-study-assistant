import React, { useState, useRef, useEffect } from 'react';
import { generateTutorResponse } from '../services/geminiService';
import { ChatMessage, UserLevel } from '../types';
import { Send, Search, Loader2, BookOpen } from 'lucide-react';
import GameArcade from './Games';

interface Props {
  userLevel: UserLevel;
  language: 'English' | 'Bangla';
  studyContext?: string;
}

const ChatInterface: React.FC<Props> = ({ userLevel, language, studyContext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hi! I'm Vidya. I can help you study for ${userLevel}. Ask me anything! ${language === 'Bangla' ? '(আপনি বাংলায় প্রশ্ন করতে পারেন)' : ''}` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [showGames, setShowGames] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    // SECRET CODE CHECK
    if (input.trim().toLowerCase() === 'op tipset') {
        setShowGames(true);
        setInput('');
        return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await generateTutorResponse(userMsg.text, history, userLevel, language, useSearch, studyContext);
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "Sorry, I couldn't generate a response.",
        groundingUrls: response.groundingUrls
      };
      
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "An error occurred. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (showGames) {
      return <GameArcade onClose={() => setShowGames(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div className="flex items-center">
            <h2 className="font-semibold text-gray-800 mr-2">Study Chat</h2>
            {studyContext && (
                <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                    <BookOpen size={12} className="mr-1"/> Context Loaded
                </span>
            )}
        </div>
        <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Google Search:</span>
            <button 
                onClick={() => setUseSearch(!useSearch)}
                className={`p-2 rounded-full transition-colors ${useSearch ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}
                title="Toggle Google Search"
            >
                <Search size={16} />
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none'
            }`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
              
              {/* Grounding Sources */}
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
                  <ul className="text-xs space-y-1">
                    {msg.groundingUrls.map((url, idx) => (
                      <li key={idx}>
                        <a href={url.uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate block">
                          {url.title || url.uri}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-200 flex items-center space-x-2">
                    <Loader2 className="animate-spin text-indigo-600" size={16} />
                    <span className="text-sm text-gray-500">Vidya is thinking...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={language === 'Bangla' ? "এখানে লিখুন..." : "Ask a question..."}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;