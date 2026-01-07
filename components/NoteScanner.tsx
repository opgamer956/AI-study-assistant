import React, { useState } from 'react';
import { processStudyMaterial } from '../services/geminiService';
import { Upload, FileText, CheckCircle, AlertCircle, Link as LinkIcon, File, Video, Image as ImageIcon, Loader2 } from 'lucide-react';

interface Props {
  onContextUpdate: (newContext: string) => void;
  currentContext: string;
}

const NoteScanner: React.FC<Props> = ({ onContextUpdate, currentContext }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  
  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | 'pdf' | null>(null);
  
  // Link State
  const [url, setUrl] = useState('');
  
  // Processing State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAnalysis(''); 
      setError('');
      
      const type = selectedFile.type;
      if (type.startsWith('image/')) setFileType('image');
      else if (type.startsWith('video/')) setFileType('video');
      else if (type === 'application/pdf') setFileType('pdf');
      else {
          setError("Unsupported file type. Please upload Image, Video, or PDF.");
          setFile(null);
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleProcess = async () => {
    setLoading(true);
    setError('');
    
    try {
      let result = "";
      
      if (activeTab === 'upload' && file && preview) {
         // Remove Data URL prefix for base64
         const base64Data = preview.split(',')[1];
         result = await processStudyMaterial('file', base64Data, file.type);
      } else if (activeTab === 'link' && url) {
         result = await processStudyMaterial('url', url);
      } else {
          return;
      }

      setAnalysis(result);
      onContextUpdate(currentContext + "\n\n" + `[Source: ${activeTab === 'link' ? url : file?.name}]:\n` + result);
    } catch (err: any) {
      console.error(err);
      setError("Failed to process content. Please try again. Note: Large videos/PDFs may exceed limits.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <FileText className="mr-2 text-indigo-600" /> Smart Resource Scanner
        </h2>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
            <button 
                onClick={() => setActiveTab('upload')}
                className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'upload' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Upload File (PDF, Image, Video)
            </button>
            <button 
                onClick={() => setActiveTab('link')}
                className={`pb-3 px-4 font-medium text-sm transition-colors ${activeTab === 'link' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Web Link / URL
            </button>
        </div>
        
        {/* Upload View */}
        {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors relative">
            <input 
                type="file" 
                accept="image/*,video/*,application/pdf" 
                onChange={handleFileChange} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
                <div className="flex flex-col items-center">
                    {fileType === 'image' && preview && <img src={preview} alt="Preview" className="h-32 object-contain mb-2 rounded shadow-sm" />}
                    {fileType === 'video' && <Video size={48} className="text-indigo-500 mb-2" />}
                    {fileType === 'pdf' && <File size={48} className="text-red-500 mb-2" />}
                    
                    <p className="text-gray-800 font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-sm text-gray-500 uppercase">{fileType}</p>
                    <p className="text-green-600 font-medium flex items-center mt-2"><CheckCircle size={16} className="mr-1"/> Ready to Scan</p>
                </div>
            ) : (
                <div className="flex flex-col items-center text-gray-500">
                <Upload size={48} className="mb-2 text-indigo-400" />
                <p className="font-medium">Click or drag to upload</p>
                <p className="text-xs mt-1">Supports PDF, Images, and Video clips</p>
                </div>
            )}
            </div>
        )}

        {/* Link View */}
        {activeTab === 'link' && (
            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Enter Website or Video URL</label>
                <div className="flex items-center border border-gray-300 rounded-lg p-2 focus-within:ring-2 focus-within:ring-indigo-500">
                    <LinkIcon className="text-gray-400 mr-2" />
                    <input 
                        type="url" 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 outline-none text-gray-800"
                    />
                </div>
            </div>
        )}

        <button
          onClick={handleProcess}
          disabled={loading || (activeTab === 'upload' && !file) || (activeTab === 'link' && !url)}
          className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex justify-center items-center"
        >
          {loading ? (
              <>
                 <Loader2 className="animate-spin mr-2" /> Scanning & Memorizing...
              </>
          ) : 'Scan & Remember'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center border border-red-200">
            <AlertCircle size={20} className="mr-2"/> {error}
        </div>
      )}

      {analysis && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-gray-800 text-lg">Scanned Knowledge</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">Added to Context</span>
          </div>
          <div className="prose prose-indigo max-w-none text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteScanner;