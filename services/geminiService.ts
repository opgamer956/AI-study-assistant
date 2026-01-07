import { GoogleGenAI, Type, FunctionDeclaration, LiveServerMessage, Modality } from "@google/genai";
import { QuizQuestion, UserLevel, StudyPlan } from "../types";

// Helper to get client with current key
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean JSON string from Markdown code blocks
const cleanJSON = (text: string): string => {
  if (!text) return "[]";
  // Remove ```json and ``` at the end, or just ```
  let cleaned = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
  return cleaned.trim();
};

// 1. AI Tutor (Text Chat with Thinking & Search)
export const generateTutorResponse = async (
  prompt: string,
  history: any[],
  level: UserLevel,
  language: 'English' | 'Bangla',
  useSearch: boolean,
  studyContext?: string
) => {
  const ai = getClient();
  
  let contextInstruction = "";
  if (studyContext) {
    contextInstruction = `
    CURRENT STUDY CONTEXT (From uploaded documents/videos/links):
    ${studyContext}
    
    Instruction: Use the context above to answer user questions if relevant.
    `;
  }

  const systemInstruction = `You are Vidya, an expert AI tutor. 
  Target Audience Level: ${level}.
  Language: Reply primarily in ${language}. If explaining complex terms in Bangla, keep the English term in brackets.
  Tone: Encouraging, clear, and concise. Use emojis occasionally.
  If the user asks for a study plan, format it clearly.
  ${contextInstruction}`;

  const tools: any[] = [];
  if (useSearch) {
    tools.push({ googleSearch: {} });
  }

  // Use Gemini 3 Pro for complex reasoning/thinking, or Flash for search
  const model = useSearch ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
  
  const config: any = {
    systemInstruction,
    tools,
  };

  // Enable thinking for Pro model if not searching
  if (!useSearch) {
    config.thinkingConfig = { thinkingBudget: 8192 }; // Moderate budget for tutoring
  }

  const chat = ai.chats.create({
    model,
    config,
    history
  });

  const response = await chat.sendMessage({ message: prompt });
  
  // Extract grounding info if available
  let groundingUrls: Array<{uri: string, title: string}> = [];
  if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
    response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) {
        groundingUrls.push({ uri: chunk.web.uri, title: chunk.web.title });
      }
    });
  }

  return {
    text: response.text,
    groundingUrls
  };
};

// 2. Multimodal Resource Processor (PDF, Image, Video, URL)
export const processStudyMaterial = async (
    type: 'url' | 'file',
    content: string, // URL string or Base64 string
    mimeType?: string
) => {
    const ai = getClient();
    
    let parts: any[] = [];
    let prompt = "";

    if (type === 'url') {
        // Use Gemini with Search to analyze the URL
        prompt = `Access and summarize the key educational content from this URL: ${content}. Focus on facts, definitions, and key concepts suitable for a student.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return response.text;
    } else {
        // File Processing (PDF, Image, Video)
        parts = [
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: content } },
            { text: "Analyze this content in detail. Extract all key topics, definitions, formulas, and summaries. This will be used as a knowledge base for a student." }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest', 
            contents: { parts }
        });
        return response.text;
    }
};

// 3. Quiz Generator (JSON Schema)
export const generateQuiz = async (
  topic: string, 
  level: UserLevel, 
  language: 'English' | 'Bangla',
  difficulty: 'Easy' | 'Medium' | 'Hard',
  numQuestions: number = 5
): Promise<QuizQuestion[]> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Create a ${difficulty} difficulty quiz about ${topic}. Level: ${level}. Language: ${language}. Generate exactly ${numQuestions} multiple choice questions.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];
  try {
      return JSON.parse(cleanJSON(text)) as QuizQuestion[];
  } catch (e) {
      console.error("JSON Parse Error in Quiz", e);
      return [];
  }
};

// 4. Visual Aids (Image Generation Only)
export const generateEducationalImage = async (prompt: string, highQuality: boolean = false) => {
  const ai = getClient();
  
  if (highQuality) {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { imageSize: '2K' } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
  } else {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: '16:9' } }
    });
     for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;
  }
};

// 5. TTS
export const textToSpeech = async (text: string, voiceName: string = 'Puck') => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        },
      },
    },
  });
  
  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64;
};

// 6. Find Study Spots (Maps Grounding)
export const findStudySpots = async (latitude: number, longitude: number) => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash", // Only 2.5 supports Maps
    contents: "Find 3 quiet libraries or cafes suitable for studying near me. List them nicely.",
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: { latitude, longitude }
        }
      }
    }
  });
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return {
    text: response.text,
    places: groundingChunks.map((c: any) => c.maps).filter(Boolean)
  };
};

// 7. Live API Connection Helper
export const connectLiveSession = async (
    callbacks: any, 
    level: string, 
    language: string
) => {
    const ai = getClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: `You are a helpful study tutor. Level: ${level}. Language: ${language}. Keep answers concise.`,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
        }
    });
};

// 8. Generate Study Plan
export const generateStudyPlan = async (
  exams: Array<{ name: string; date: string }>,
  topics: string,
  hoursPerDay: number,
  level: string,
  language: string
): Promise<StudyPlan[]> => {
  const ai = getClient();
  const today = new Date().toLocaleDateString();

  const prompt = `
    Act as an expert academic planner specializing in the Bangladesh National Curriculum and Textbook Board (NCTB) education system.
    Today is ${today}.
    
    Student Profile:
    - Level: ${level} (Strictly follow NCTB syllabus standards and book references for this level)
    - Language Preference: ${language}
    
    Exam Schedule:
    ${JSON.stringify(exams)}
    
    Focus Topics / Syllabus:
    ${topics}
    
    Constraints:
    - Study hours per day: ${hoursPerDay}
    
    Task:
    Create a strategic, day-by-day study plan leading up to the exams.
    
    Guidelines:
    1. Curriculum Alignment: Ensure topics and depth matches the specific class/level in the Bangladesh education system.
    2. Intelligent Breakdown: If the user inputs a broad chapter (e.g., 'Physics Chapter 5' or 'Calculus'), you MUST break it down into smaller, manageable sub-topics (e.g., 'Formulas & Definitions', 'Creative Questions/Srijonshil Practice', 'MCQ Drill'). Do not just repeat the chapter name.
    3. Exam Priority: Heavily weigh the plan towards the nearest upcoming exam. Schedule intensive revision 2-3 days before any exam date.
    4. Exam Day Marking: On the specific date of an exam, the plan should explicitly list the Exam event as the primary activity.
    5. Balance: Mix hard and easy topics.
    6. Formatting: Return valid JSON matching the schema. Dates must be YYYY-MM-DD.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "YYYY-MM-DD" },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  duration: { type: Type.STRING, description: "e.g., '60 mins'" },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
                },
                required: ["subject", "topic", "duration", "priority"]
              }
            }
          },
          required: ["date", "tasks"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) return [];
  try {
      return JSON.parse(cleanJSON(text)) as StudyPlan[];
  } catch (e) {
      console.error("JSON Parse Error in Study Plan", e);
      return [];
  }
};