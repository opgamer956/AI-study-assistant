import { Type } from "@google/genai";

export enum ViewState {
  HOME = 'HOME',
  TUTOR = 'TUTOR',
  SCANNER = 'SCANNER',
  QUIZ = 'QUIZ',
  PLANNER = 'PLANNER',
  LIVE = 'LIVE',
  VISUALS = 'VISUALS',
  SPOTS = 'SPOTS'
}

export enum UserLevel {
  CLASS_1 = 'Class 1',
  CLASS_2 = 'Class 2',
  CLASS_3 = 'Class 3',
  CLASS_4 = 'Class 4',
  CLASS_5 = 'Class 5',
  CLASS_6 = 'Class 6',
  CLASS_7 = 'Class 7',
  CLASS_8 = 'Class 8',
  CLASS_9 = 'Class 9',
  CLASS_10 = 'Class 10 (SSC)',
  CLASS_11 = 'Class 11',
  CLASS_12 = 'Class 12 (HSC)',
  SSC = 'SSC Exam Candidate',
  HSC = 'HSC Exam Candidate',
  ADMISSION = 'University Admission',
  JOB = 'Job Preparation',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  isThinking?: boolean;
  groundingUrls?: Array<{uri: string, title: string}>;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // The specific string matching one option
  explanation: string;
}

export interface StudyPlan {
  date: string;
  tasks: Array<{
    subject: string;
    topic: string;
    duration: string;
    priority: 'High' | 'Medium' | 'Low';
    completed?: boolean;
    notes?: string;
  }>;
}

// For Veo Video Generation and Speech Recognition
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    webkitAudioContext: typeof AudioContext;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}