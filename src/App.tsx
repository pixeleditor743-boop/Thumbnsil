import React, { useState, useCallback } from 'react';
import { Upload, Youtube, Image as ImageIcon, Sparkles, Loader2, Trash2, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateThumbnail, ReferenceImage } from './services/gemini';

declare global {
  interface Window {
    aistudio?: {
      openSelectKey: () => Promise<void>;
      hasSelectedApiKey: () => Promise<boolean>;
    };
  }
}

export default function App() {
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'thumbnail' | 'logo'>('thumbnail');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferences(prev => {
          if (prev.length >= 15) return prev;
          return [...prev, { data: reader.result as string, mimeType: file.type }];
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeReference = (index: number) => {
    setReferences(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      setError(`Please enter a ${mode === 'thumbnail' ? 'video title' : 'logo description'}.`);
      return;
    }
    if (mode === 'thumbnail' && references.length === 0) {
      setError("Please upload at least one reference image for thumbnails.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generateThumbnail(title, references, mode);
      setResultImage(generated);
    } catch (err: any) {
      const msg = err.message || "Failed to generate. Please try again.";
      setError(msg);
      
      // If it's a quota error, we show a specific action
      if (msg.includes("Quota Exceeded")) {
        console.log("Quota hit. User might need to switch to a paid key.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    } else {
      alert("API Key selection is only available in the AI Studio environment.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-red-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg shadow-lg shadow-red-600/20">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Creative<span className="text-red-600">Studio</span></h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/60">
            <button 
              onClick={handleOpenKeySelector}
              className="px-3 py-1 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-xs"
            >
              API Settings
            </button>
            <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
            <span className="hidden sm:inline">Powered by Gemini 2.5</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Controls */}
        <div className="lg:col-span-5 space-y-10">
          {/* Mode Switcher */}
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              onClick={() => setMode('thumbnail')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'thumbnail' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-white/40 hover:text-white'}`}
            >
              Thumbnail
            </button>
            <button
              onClick={() => setMode('logo')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'logo' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-white/40 hover:text-white'}`}
            >
              Logo
            </button>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-red-500" />
                Reference Images
              </h2>
              <span className="text-xs text-white/40 font-mono uppercase tracking-widest">
                {references.length} / 15 Uploaded
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <AnimatePresence mode="popLayout">
                {references.map((ref, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group"
                  >
                    <img src={ref.data} alt={`Ref ${idx}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeReference(idx)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
                {references.length < 15 && (
                  <label className="aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-red-500/50 hover:bg-red-500/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                    <Plus className="w-6 h-6 text-white/20 group-hover:text-red-500" />
                    <span className="text-[10px] uppercase tracking-widest text-white/30 group-hover:text-red-500/70">Add Ref</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileUpload} />
                  </label>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-white/40 italic">
              * Upload up to 15 images to define your brand style and face.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-red-500" />
              {mode === 'thumbnail' ? 'Video Details' : 'Logo Details'}
            </h2>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-white/40 font-semibold">
                {mode === 'thumbnail' ? 'Video Title' : 'Logo Description'}
              </label>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={mode === 'thumbnail' ? "e.g., How to create a Movie App using ChatGPT on Mobile" : "e.g., A minimalist logo for a tech startup called 'Nexus'"}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600/50 min-h-[120px] transition-all"
              />
            </div>
          </section>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || (mode === 'thumbnail' && references.length === 0)}
            className="w-full bg-red-600 hover:bg-red-500 disabled:bg-white/5 disabled:text-white/20 text-white font-bold py-4 rounded-2xl shadow-xl shadow-red-600/20 transition-all flex items-center justify-center gap-3 group overflow-hidden relative"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Magic...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Create {mode === 'thumbnail' ? 'Thumbnail' : 'Logo'}</span>
              </>
            )}
          </button>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-7">
          <div className="sticky top-32">
            <div className={`rounded-3xl bg-white/5 border border-white/10 overflow-hidden relative group shadow-2xl shadow-black ${mode === 'thumbnail' ? 'aspect-video' : 'aspect-square max-w-md mx-auto'}`}>
              {resultImage ? (
                <motion.img
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={resultImage}
                  alt="Generated Result"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium tracking-wide">Your masterpiece will appear here</p>
                </div>
              )}

              {isGenerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-red-600 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-lg font-bold">Designing your {mode}</p>
                    <p className="text-sm text-white/40">Analyzing your style and details...</p>
                  </div>
                </div>
              )}
            </div>

            {resultImage && !isGenerating && (
              <div className={`mt-6 flex items-center justify-between ${mode === 'logo' ? 'max-w-md mx-auto' : ''}`}>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <ImageIcon className="w-4 h-4" />
                  <span>{mode === 'thumbnail' ? '1920 x 1080' : '1024 x 1024'} • PNG</span>
                </div>
                <a
                  href={resultImage}
                  download={`${mode}.png`}
                  className="px-6 py-2 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 rotate-180" />
                  Download
                </a>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 text-center text-white/20 text-xs uppercase tracking-[0.2em]">
        © 2026 Creative Studio • AI Assisted Creative Studio
      </footer>
    </div>
  );
}
