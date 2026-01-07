import React, { useState } from 'react';
import { generateEducationalImage } from '../services/geminiService';
import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react';

const VisualAids: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [highQuality, setHighQuality] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setError('');
    setResultUrl(null);

    try {
        const url = await generateEducationalImage(prompt, highQuality);
        if (url) setResultUrl(url);
        else setError("Failed to generate image.");
    } catch (err: any) {
      setError(err.message || "Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
            <Sparkles className="mr-2 text-indigo-600" /> Visual Learning Aids
          </h2>
          <p className="text-gray-500 mb-6 text-sm">Generate diagrams, concept art, and educational illustrations.</p>

          <div className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the diagram or image (e.g., A labeled diagram of a plant cell)"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
            />
            
            <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={highQuality} onChange={e => setHighQuality(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">High Quality (HD/4K) - Uses Gemini 3 Pro</span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={loading || !prompt}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" /> Generating Image...
                </>
              ) : (
                <>
                   <ImageIcon className="mr-2" size={20} /> Generate Image
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6 border border-red-200">
                {error}
            </div>
        )}

        {resultUrl && (
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 flex justify-center items-center bg-gray-900">
              <img src={resultUrl} alt="Generated result" className="max-h-[500px] rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualAids;