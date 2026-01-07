import React, { useRef, useState, useEffect } from 'react';
import { connectLiveSession } from '../services/geminiService';
import { UserLevel } from '../types';
import { Mic, MicOff, Activity, AlertCircle } from 'lucide-react';
import { LiveServerMessage } from '@google/genai';

interface Props {
  userLevel: UserLevel;
  language: 'English' | 'Bangla';
}

const LiveTutor: React.FC<Props> = ({ userLevel, language }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false); // Model is speaking
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null); // To store session object
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const stopSession = () => {
      if (sessionRef.current) {
          sessionRef.current.close();
          sessionRef.current = null;
      }
      if (inputContextRef.current) {
          inputContextRef.current.close();
          inputContextRef.current = null;
      }
      if (outputContextRef.current) {
          outputContextRef.current.close();
          outputContextRef.current = null;
      }
      sourcesRef.current.forEach(source => source.stop());
      sourcesRef.current.clear();
      setIsConnected(false);
      setIsSpeaking(false);
  };

  const startSession = async () => {
    setError('');
    try {
      // 1. Audio Setup
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 2. Connect Live
      const sessionPromise = connectLiveSession(
        {
          onopen: () => {
            setIsConnected(true);
            // Setup Input Stream
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               const pcmBlob = createBlob(inputData);
               sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio) {
                 setIsSpeaking(true);
                 if (!outputContextRef.current) return;
                 
                 const ctx = outputContextRef.current;
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 
                 const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(ctx.destination);
                 source.addEventListener('ended', () => {
                     sourcesRef.current.delete(source);
                     if(sourcesRef.current.size === 0) setIsSpeaking(false);
                 });
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 sourcesRef.current.add(source);
             }

             if (msg.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
                 setIsSpeaking(false);
             }
          },
          onclose: () => {
              setIsConnected(false);
              stopSession();
          },
          onerror: (e: any) => {
              console.error(e);
              setError("Connection error.");
              stopSession();
          }
        },
        userLevel,
        language
      );
      
      sessionRef.current = await sessionPromise;

    } catch (e) {
      console.error(e);
      setError("Failed to access microphone or connect.");
      stopSession();
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  // Helper: Create PCM Blob
  const createBlob = (data: Float32Array) => {
      const l = data.length;
      const int16 = new Int16Array(l);
      for(let i=0; i<l; i++) int16[i] = data[i] * 32768;
      const uint8 = new Uint8Array(int16.buffer);
      let binary = '';
      for(let i=0; i<uint8.byteLength; i++) binary += String.fromCharCode(uint8[i]);
      const base64 = btoa(binary);
      return { mimeType: 'audio/pcm;rate=16000', data: base64 };
  };

  // Helper: Decode Base64 to ArrayBuffer
  const decode = (base64: string) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for(let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, rate: number, channels: number) => {
     const dataInt16 = new Int16Array(data.buffer);
     const frameCount = dataInt16.length / channels;
     const buffer = ctx.createBuffer(channels, frameCount, rate);
     for(let c=0; c<channels; c++) {
         const channelData = buffer.getChannelData(c);
         for(let i=0; i<frameCount; i++) {
             channelData[i] = dataInt16[i*channels+c] / 32768.0;
         }
     }
     return buffer;
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          {/* Decorative background circles */}
          <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl mix-blend-multiply animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-pink-500 rounded-full blur-3xl mix-blend-multiply animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="z-10 text-center space-y-8">
        <h2 className="text-3xl font-bold tracking-tight">Voice Tutor Live</h2>
        <p className="text-indigo-200 max-w-md">
           Have a real-time conversation to practice languages, ask complex questions, or revise topics.
        </p>

        {/* Visualizer Circle */}
        <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
            isConnected 
            ? 'bg-indigo-500 shadow-[0_0_50px_rgba(99,102,241,0.6)] scale-110' 
            : 'bg-gray-700'
        }`}>
            {isConnected ? (
                <Activity size={64} className={`text-white ${isSpeaking ? 'animate-bounce' : ''}`} />
            ) : (
                <MicOff size={48} className="text-gray-400" />
            )}
        </div>

        <div className="flex gap-4">
             {!isConnected ? (
                 <button 
                    onClick={startSession}
                    className="px-8 py-4 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition-transform hover:scale-105 shadow-lg flex items-center"
                 >
                    <Mic className="mr-2" /> Start Session
                 </button>
             ) : (
                 <button 
                    onClick={stopSession}
                    className="px-8 py-4 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-transform hover:scale-105 shadow-lg"
                 >
                    End Session
                 </button>
             )}
        </div>
        
        {error && (
            <div className="bg-red-900/50 p-4 rounded-lg flex items-center text-red-200 border border-red-700">
                <AlertCircle className="mr-2" /> {error}
            </div>
        )}
      </div>
    </div>
  );
};

export default LiveTutor;
